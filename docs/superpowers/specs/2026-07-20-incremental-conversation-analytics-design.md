# Incremental Conversation Analytics Design

## Goal

Replace live per-conversation analytics rebuilds with idempotent incremental projections while preserving the current Team Analytics results and keeping message delivery independent from analytics work.

The implementation must:

- Stop rereading up to 500 messages after each message.
- Stop deleting and recreating up to 200 metric entries after each change.
- Keep using the existing `analyticsMetrics` `TableAggregate`.
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

### Scheduled idempotent contribution projection

Keep `analyticsMetricEntries` as the aggregate source. Schedule bounded workers after canonical writes, then insert, patch, delete, or no-op deterministic contribution rows.

This is the selected approach. It preserves the current aggregate query model, isolates failures from message delivery, supports retries, and changes normal message work from hundreds of operations to a small constant number.

## Architecture

### Versioned aggregate contributions

Version 2 contributions use:

- Namespaces prefixed with `v2:`.
- Source keys prefixed with `v2:`.
- The existing `analyticsMetricEntries` table.
- The existing `analyticsMetrics` `TableAggregate`.

Versioned namespaces allow v1 and v2 data to coexist during backfill without double-counting. Dashboard queries continue reading v1 namespaces until v2 verification passes, then switch to v2 in a separate deployment.

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

### Message projection worker

Canonical message writers schedule a worker with the newly inserted message IDs. Scheduling remains atomic with message persistence, but projection work runs after commit.

For each message, the worker:

1. Loads the message and conversation.
2. Updates the projection state using minimum-time comparisons.
3. Inserts the human `messageSentCount` contribution when `authorUserId` exists.
4. Reconciles first-reply and first-human-reply contributions when their state changes.
5. Reconciles current conversation, channel, member, conversion, drop, and active contributions.

Duplicate scheduling is safe because message and conversation contribution source keys are deterministic.

### Conversation-state projection worker

Conversation, customer, lead-routing, escalation, and tag writers schedule a conversation-state projection after changing:

- `assignedUserId`
- `status`
- `lastMessageAt`
- the `converted` tag
- customer lead temperature

The worker reads the current conversation and customer, builds the desired bounded set of state contributions, and reconciles only their known source keys.

Assignee changes patch stable member-role contributions into the new member namespace. Closing or reopening a conversation deletes or recreates active contributions. Conversion and Cold-lead reversals remove the corresponding rows.

### Topic projection worker

Topic assignment changes schedule a topic reconciliation for one conversation. The worker reads the bounded assignment set, upserts one contribution per current topic, and deletes obsolete v2 topic contribution rows for that conversation.

The current five-topic product limit keeps this operation bounded.

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
- A failed scheduled projection leaves the canonical message or state change committed.
- Re-running the same worker is safe.
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

## Migration and Rollout

### Deploy 1: widen and dual write

1. Add the optional-compatible projection-state table and v2 modules.
2. Add v2 message, conversation-state, and topic scheduling to every current analytics writer.
3. Keep v1 refresh requests and v1 dashboard reads temporarily.
4. Deploy and verify that v2 rows are created for new activity.

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
2. Stop scheduling v1 conversation refreshes from live writers.
3. Keep the repair entrypoints and v1 data intact during the observation window.
4. Verify dashboard parity, projection failures, aggregate health, and OCC insights.

### Cleanup

After the observation window:

1. Delete v1 metric entries in cursor batches.
2. Remove `conversationAnalyticsRefreshRequests` and its workers.
3. Remove or archive `conversationAnalyticsFacts` after confirming no consumer remains.
4. Remove migration-only code in a later cleanup deployment.

Production migrations and cutover are not executed automatically as part of local implementation. They require an explicit dry run, monitored migration, verification, and production deployment decision.

## Module Boundaries

New production modules remain below 300 lines:

- `analyticsMetricContributions.ts`: v2 namespace/source-key builders and idempotent row operations.
- `analyticsProjectionState.ts`: first-message/reply state transitions.
- `analyticsMessageProjection.ts`: message worker and message contribution logic.
- `analyticsConversationProjection.ts`: conversation/customer/member/channel state reconciliation.
- `analyticsTopicProjection.ts`: bounded topic reconciliation.
- `analyticsProjectionMigration.ts`: migration definitions and runners.
- `analyticsProjectionRepair.ts`: bounded targeted repair entrypoints.

Existing dashboard query functions remain public-compatible. Existing channel ingestion entrypoints remain stable.

## Testing

Tests must cover:

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

## Acceptance Criteria

- A normal incoming message performs a bounded number of v2 metric operations independent of conversation length.
- Retrying a message projection does not change aggregate totals.
- Conversations beyond 500 messages continue receiving correct new contributions.
- No live projection deletes an arbitrary set of conversation metric rows.
- Mutable state reversals remove or replace their previous aggregate contributions.
- Dashboard results match the existing product semantics after v2 backfill.
- Message persistence remains successful when projection work fails.
- Development migration passes dry run, monitored execution, parity checks, and focused tests before cutover.
