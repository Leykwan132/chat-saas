# Incremental Conversation Analytics Design

## Goal

Replace live per-conversation analytics rebuilds with idempotent incremental projections while preserving the current Team Analytics results and keeping message delivery independent from analytics work.

The implementation must:

- Remove the live 500-message query rather than replacing it with another fixed correctness cap.
- Remove the live 200-row delete/reinsert operation.
- Keep using the existing `analyticsMetrics` `TableAggregate`.
- Coalesce analytics-relevant changes for one conversation into a 15-minute dirty window.
- Remain correct under webhook retries, Convex retries, duplicate scheduling, out-of-order provider timestamps, and mutable conversation state.
- Provide a migration-safe path for existing metric data.
- Retain a bounded repair mechanism without putting full rebuilds back on live message paths.

## Current Problem

`syncConversationAnalyticsHandler` treats each change as a reason to rebuild one conversation:

1. Read the conversation, customer, topics, and up to the oldest 500 messages.
2. Recalculate the conversation fact.
3. Delete up to 200 existing metric entries.
4. Recreate the complete metric set.
5. Invoke the aggregate component once for every metric deletion and insertion.

The fixed read and delete limits cap transaction work but also create correctness gaps:

- Messages after the oldest 500 are excluded.
- Conversations with more than 200 metric rows may retain stale rows.
- Every message repeats work whose result is usually unchanged.

## Approaches Considered

### Direct shared counters

Patch workspace, channel, and member total documents directly.

This has the smallest row count but creates hot shared documents, write contention, complicated date-range handling, and difficult reversals. It does not fit the existing range-based aggregate queries.

### Database triggers on source tables

Register triggers on messages, conversations, customers, and topic assignments.

This centralizes callsites but runs projection work inside the canonical write transaction. A projection regression could once again block message delivery, and trigger fan-out would enlarge read/write sets.

### Immediate idempotent contribution projection

Keep `analyticsMetricEntries` as the aggregate source. Schedule bounded workers after canonical writes, then insert, patch, delete, or no-op deterministic contribution rows.

This preserves the current aggregate query model and isolates failures from message delivery, but one scheduled worker per message or mutation creates avoidable scheduler traffic during bursts.

### Append-only analytics outbox

Insert one analytics event for every source change and process events in cursor batches.

This avoids a hot per-conversation queue row and preserves exact message identifiers, but it creates and later deletes one extra document per event. It is preferable only if one conversation regularly receives many concurrent writers.

### Fifteen-minute dirty conversation queue

Keep `analyticsMetricEntries` as the aggregate source, but record one dirty row per affected conversation. A 15-minute dispatcher coalesces repeated changes and schedules bounded idempotent projection workers.

This is the selected approach. It keeps the canonical write path small, preserves the current aggregate query model, isolates failures from message delivery, supports retries, and turns a burst of changes into one projection cycle.

## Architecture

### Versioned aggregate contributions

Version 2 contributions use:

- Namespaces prefixed with `v2:`.
- Source keys prefixed with `v2:`.
- The existing `analyticsMetricEntries` table.
- The existing `analyticsMetrics` `TableAggregate`.

Versioned namespaces allow v1 and v2 data to coexist during backfill without double-counting. Dashboard queries continue reading v1 namespaces until v2 verification passes, then switch to v2 in a separate deployment.

The existing aggregate component remains installed once. Its existing trigger continues to interpret `analyticsMetricEntries` changes as follows:

- Insert: add the row's value to its namespace and sort key.
- Patch: replace the old contribution with the new contribution.
- Delete: subtract the old contribution.
- No database write: perform no aggregate work.

All v2 writers use the trigger-wrapped `internalMutation` exported by `convex/triggers.ts`. They must not write aggregate source rows through a raw mutation context.

### Deterministic contribution store

A focused metric-store module owns four operations:

- `ensureMetricContribution`
- `replaceMetricContribution`
- `removeMetricContribution`
- `reconcileMetricContributions`

Every operation resolves the row through `by_sourceKey`.

Behavior:

- Missing desired row: insert it.
- Existing identical row: no-op.
- Existing changed row: patch it so the aggregate trigger replaces the old contribution.
- Existing row no longer desired: delete it so the aggregate trigger subtracts the contribution.
- Duplicate source rows: fail visibly. Migration verification must clean existing v2 duplicates rather than hiding them.

Only aggregate-relevant and identity fields participate in equality checks. Timestamps are not rewritten when the contribution is unchanged.

### Conversation projection state

Add `conversationAnalyticsProjectionStates` with one v2 state row per conversation:

- `conversationId`
- `firstCustomerMessageAt`
- `firstOutgoingAt`
- `firstHumanOutgoingAt`
- `firstHumanMessageId`
- `firstHumanMemberUserId`
- `convertedAt`
- `droppedAt`
- `createdAt`
- `updatedAt`

This state stores only values required to incrementally maintain first-response and duration metrics. Legacy message counters in `conversationAnalyticsFacts` are not dashboard inputs and will not remain on the live write path.

Incoming and outgoing message events update the timestamp fields using minimum-time semantics. A late historical message can therefore move a first timestamp earlier and replace only the affected duration contributions.

### Dirty conversation queue

Add `conversationAnalyticsDirtyRequests` with one operational row per dirty conversation:

- `conversationId`
- `revision`
- `requestedAt`
- `nextAttemptAt`
- optional `earliestDirtyMessageAt`

The table has `by_conversationId` and `by_nextAttemptAt` indexes. It is separate from the existing `conversationAnalyticsRefreshRequests` table during migration because the v1 worker currently owns and deletes those rows. Sharing the table during dual-write could lose pending v2 work.

`markConversationAnalyticsDirty` performs one indexed lookup and one insert or patch:

- A clean conversation inserts revision `1`, sets both `requestedAt` and `nextAttemptAt` to the current time, and stores the earliest new message timestamp when applicable.
- An already dirty conversation increments `revision`, updates `requestedAt`, and retains its existing `nextAttemptAt`.
- Message batches mark each affected conversation once using the minimum `createdAt` across the batch.
- `earliestDirtyMessageAt` keeps the minimum timestamp in the current dirty window so late provider events cannot be skipped.
- State-only and topic-only changes leave `earliestDirtyMessageAt` unchanged.

New activity never pushes `nextAttemptAt` later, so a continuously active conversation cannot postpone analytics forever. The dirty row contains no message-ID array or other unbounded field.

### Fifteen-minute dispatcher

A cron registered with `crons.interval` runs every 15 minutes and queries up to 25 rows where `nextAttemptAt <= now`.

For every selected request, the dispatcher atomically:

1. Moves `nextAttemptAt` forward by 15 minutes.
2. Schedules one projection worker with the request ID.

When a full dispatcher batch is selected, the dispatcher schedules another bounded dispatcher invocation so a large due queue drains without placing all scheduler operations in one mutation. Moving selected rows' `nextAttemptAt` forward prevents the continuation from selecting the same rows again.

### Incremental projection worker

The worker loads the dirty request and captures its current revision. It then:

1. Reads only messages at or after `earliestDirtyMessageAt` through `by_conversationId_and_createdAt`, using cursor-based pages of 50.
2. Applies each message's deterministic contribution and minimum-time projection-state transitions.
3. Reconciles the current bounded conversation, customer, channel, member, conversion, drop, and active contribution set.
4. Reconciles the current bounded topic assignments.
5. Re-reads the dirty request.
6. Deletes the request only when its revision is unchanged.

Message pagination is a transaction boundary, not a correctness limit. A continuation carries its cursor, lower timestamp bound, and captured revision. If the revision changes during processing, the current chain stops safely and the retained request becomes eligible for another cycle. Already-applied contributions remain safe because source keys are deterministic.

State writers mark the conversation dirty after changing `assignedUserId`, `status`, `lastMessageAt`, the `converted` tag, or linked-customer lead temperature. Topic assignment writers use the same helper. The worker always reconciles current bounded state and topics, while it scans messages only when `earliestDirtyMessageAt` is present.

Assignee changes patch stable member-role contributions into the new member namespace. Closing or reopening deletes or recreates active contributions. Conversion and Cold-lead reversals remove their exact rows. Topic reconciliation reads the current five-topic product limit and deletes only obsolete v2 topic contributions.

## Contribution Identities

Mutable dimensions are not embedded in source keys. A patch moves the same logical contribution between namespaces.

| Contribution | Stable source-key role |
| --- | --- |
| Team conversation count | `conversation:{id}:team:conversationCount` |
| Team active conversation | `conversation:{id}:team:activeConversationCount` |
| Team converted count | `conversation:{id}:team:convertedCount` |
| Team conversion duration | `conversation:{id}:team:conversionDurationMs` |
| Team dropped count | `conversation:{id}:team:droppedCount` |
| Team first reply count | `conversation:{id}:team:firstReplyCount` |
| Team first reply duration | `conversation:{id}:team:firstReplyDurationMs` |
| Service conversation count | `conversation:{id}:service:conversationCount` |
| Service converted count | `conversation:{id}:service:convertedCount` |
| Channel conversation count | `conversation:{id}:channel:conversationCount` |
| Channel converted count | `conversation:{id}:channel:convertedCount` |
| Member assigned conversation | `conversation:{id}:member:assignedConversationCount` |
| Member denominator | `conversation:{id}:member:avgMessagesPerConversationDenominator` |
| Member active conversation | `conversation:{id}:member:activeConversationCount` |
| Member converted count | `conversation:{id}:member:convertedCount` |
| Member conversion duration | `conversation:{id}:member:conversionDurationMs` |
| Member dropped count | `conversation:{id}:member:droppedCount` |
| First human reply count | `conversation:{id}:member:firstHumanReplyCount` |
| First human reply duration | `conversation:{id}:member:firstHumanReplyDurationMs` |
| Human message sent | `message:{messageId}:member:messageSentCount` |
| Topic mention | `conversation:{id}:topic:{topicId}:topicMentionCount` |

Every stored key and namespace receives the `v2:` prefix.

## Metric Semantics

Version 2 preserves current dashboard semantics:

- Conversation start is the earliest customer message, otherwise conversation creation.
- Active means conversation status is not `closed`.
- Converted means the normalized conversation tags contain `converted`.
- Dropped means the linked customer's lead temperature is `Cold`.
- General first reply is the earliest outgoing message after the first customer message.
- First human reply is the earliest outgoing message with `authorUserId` after the first customer message.
- Member message count includes one contribution per human-authored ledger message.
- Date-range sort keys remain identical to v1.

Provider timestamps may arrive out of order. Projection state uses earlier timestamps when discovered and recalculates only dependent durations.

## Failure Handling

- Canonical writes never wait for projection computation.
- Canonical message batches perform at most one dirty upsert per affected conversation.
- A failed scheduled projection leaves the canonical message or state change committed and the dirty request retained.
- Re-running the same worker is safe.
- A revision change during processing retains the request for the next cycle.
- `nextAttemptAt` acts as both dispatch availability and a retry lease; a failed or abandoned request becomes eligible again.
- Missing messages or conversations become explicit no-op outcomes only when the canonical record was deleted.
- Duplicate v2 source keys throw and surface a migration/data-integrity fault.
- Projection workers do not silently fall back to the v1 rebuild.

## Repair

Full rebuilding is removed from live paths but retained as an explicit bounded repair facility.

Repair operates by source domain:

- Messages are replayed in cursor batches using deterministic source keys.
- Conversation/customer state is reconciled once per conversation.
- Topic assignments are reconciled from their bounded current set.
- Obsolete v2 rows are deleted in cursor batches.

Repair may target one conversation or a migration batch. It never scans an unbounded workspace or performs delete-all/reinsert-all in one transaction.

Repair batch sizes such as 25 or 50 are pagination sizes. They always persist a cursor or schedule a continuation and therefore never behave like the old 500-read or 200-delete correctness caps.

## Migration and Rollout

### Deploy 1: widen and dual write

1. Add the projection-state and dirty-request tables, v2 modules, and 15-minute dispatcher.
2. Add v2 dirty marking to every current analytics writer.
3. Keep v1 refresh requests and v1 dashboard reads temporarily.
4. Deploy and verify that dirty requests coalesce and v2 rows are created for due conversations.

### Backfill

Use `@convex-dev/migrations` with small batches:

1. Replay existing messages into v2 contributions and projection state.
2. Reconcile every existing conversation and linked customer.
3. Reconcile every existing topic assignment.
4. Run with `dryRun: true` first.
5. Run the development migration and monitor status.
6. Compare v1 and v2 dashboard outputs and inspect duplicate/missing source-key samples.

Each backfill operation is idempotent, so live dual writes and migration writes may overlap safely.

### Deploy 2: cut over

1. Switch dashboard namespace builders from v1 to v2.
2. Stop scheduling v1 conversation refreshes from live writers and remove the old rebuild from every live path.
3. Keep the v2 dirty queue and repair entrypoints active.
4. Keep v1 metric data intact during the observation window.
5. Verify dashboard parity, projection failures, aggregate health, and OCC insights.

### Cleanup

After the observation window:

1. Delete v1 metric entries in cursor batches.
2. Remove the v1 `conversationAnalyticsRefreshRequests` table and its workers.
3. Remove or archive `conversationAnalyticsFacts` after confirming no consumer remains.
4. Remove migration-only code in a later cleanup deployment.

Production migrations and cutover are not executed automatically as part of local implementation. They require an explicit dry run, monitored migration, verification, and production deployment decision.

## Module Boundaries

New production modules remain below 300 lines:

- `analyticsMetricContributions.ts`: v2 namespace/source-key builders and idempotent row operations.
- `analyticsProjectionState.ts`: first-message/reply state transitions.
- `analyticsDirtyRequest.ts`: atomic dirty upsert and queue timing.
- `analyticsDirtyDispatcher.ts`: 15-minute bounded dispatch and continuation.
- `analyticsProjectionWorker.ts`: revision-safe page orchestration and completion.
- `analyticsMessageProjection.ts`: paged message contribution logic.
- `analyticsConversationProjection.ts`: bounded conversation/customer/member/channel state reconciliation.
- `analyticsTopicProjection.ts`: bounded topic reconciliation.
- `analyticsProjectionMigration.ts`: migration definitions and runners.
- `analyticsProjectionRepair.ts`: bounded targeted repair entrypoints.

Existing dashboard query functions remain public-compatible. Existing channel ingestion entrypoints remain stable.

## Testing

Tests must cover:

- First dirty insert, repeated dirty coalescing, revision increments, and unchanged due time.
- One dirty write per conversation for a multi-message batch.
- Dispatcher due filtering, bounded drain continuation, and retry timing.
- Worker completion deleting only an unchanged revision.
- Changes during processing retaining the dirty request.
- Failed processing leaving the request retryable.
- First insert, duplicate retry no-op, changed-row replacement, and deletion.
- Incoming, AI outgoing, and human outgoing message projection.
- A late earlier message moving first-response metrics without duplication.
- Multiple media ledger messages remaining independently idempotent.
- Assignment movement between member namespaces.
- Close/reopen active contribution reversal.
- Converted-tag add/remove and conversion-duration replacement.
- Cold/Warm drop contribution reversal.
- Topic add/remove/reorder without duplicate topic counts.
- v1 and v2 namespace isolation during dual write.
- Message, conversation, and topic backfills being idempotent.
- Dashboard parity for overview, members, channels, drop-off, and topics.
- No live callsite invoking the full rebuild after cutover.
- Bounded repair resuming across batches.
- Aggregate source writes using the trigger-wrapped mutation context.

## Acceptance Criteria

- A normal incoming message performs no analytics computation and only a bounded dirty upsert after canonical persistence.
- Repeated changes to one conversation within a 15-minute window coalesce into one dirty request.
- The due time is not postponed by continued activity.
- A due conversation is processed through bounded cursor pages and eventually completes regardless of conversation length.
- Retrying a message projection does not change aggregate totals.
- Conversations beyond 500 messages continue receiving correct new contributions.
- The live v2 path contains no `MESSAGE_ANALYTICS_LIMIT`, no `.take(500)` conversation rebuild, no `.take(200)` metric cleanup, and no delete-all/reinsert-all helper.
- No live projection deletes an arbitrary set of conversation metric rows; it deletes only deterministic obsolete contributions.
- Mutable state reversals remove or replace their previous aggregate contributions.
- Existing `analyticsMetrics` aggregate queries remain in use, switching only to versioned v2 namespaces after parity verification.
- Dashboard results match the existing product semantics after v2 backfill.
- Message persistence remains successful when projection work fails.
- Development migration passes dry run, monitored execution, parity checks, and focused tests before cutover.
