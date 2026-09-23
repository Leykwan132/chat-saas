# Inbox Conversation Summary Pagination Design

## Goal

Reduce Convex read bandwidth and reactive work for the Inbox conversation list without changing its visible filtering, sorting, selection, booking, or escalation behavior.

## Current Cost

`conversations.listLinkedForCurrentOrg` reads up to 400 full conversation documents, filters connected channels after reading them, and loads each linked customer to obtain tags and lead temperature. The Inbox then applies search and filters over the returned list in the browser. Companion unread and booking queries reuse the same broad conversation scan.

## Read Model

Add `inboxConversationSummaries`, with one row for each non-playground conversation. A row contains only data required by the Inbox list: conversation ID, workspace and user scope, channel and agent scope, contact name, service, last-message preview/time, unread count, status, assignment, tags, lead temperature, escalated state, booking state, and channel-connected state.

The summary is a derived read model. `conversations`, `customers`, channels, booking records, and escalation records remain the sources of truth. Opening a row continues to use the existing selected-conversation and customer-detail queries.

## Synchronization

Summary consistency is enforced centrally, not by a checklist of call sites. The existing trigger-wrapped mutation infrastructure registers atomic triggers for `conversations`, `customers`, `channels`, `appointmentBookingSessions`, and `calendarEvents`. Each trigger invokes one summary builder that derives the current row from the source record and writes, updates, or deletes the corresponding summary.

Every public and internal mutation that can write those tables must use the trigger-wrapped mutation exports. An ESLint restriction prevents tracked-table writers from importing raw Convex mutation wrappers. Trigger errors abort the source mutation, so a conversation, customer, booking, or channel change cannot commit without its summary update.

The triggers cover these state changes:

- Conversation creation, message activity, status, assignment, unread count, or escalation changes update the conversation summary.
- Customer tag or lead-temperature changes update summaries linked to that customer.
- Booking lifecycle changes update the matching conversation summary.
- Channel connection-state changes update summaries for that channel.

The summary table has a `conversationId` index and the summary builder uses it to upsert exactly one row per source conversation. A private reconciliation check compares source conversations to summaries, detects missing, duplicate, or stale rows, and supports bounded repair outside the Inbox hot path. It runs after the migration and is retained for operational verification.

New writes begin trigger synchronization before historical records are backfilled. A resumable `@convex-dev/migrations` backfill creates missing summary rows and is dry-run and verified before production use. Migration writes explicitly use the same summary builder because migrations do not automatically run application triggers. The reader remains on the old path until the backfill and reconciliation check have both completed successfully.

## Inbox Query and Load More

Replace the eager 400-row subscription with a public paginated summary query scoped by authenticated workspace and optional agent. Its initial page contains 50 newest rows. The client uses `usePaginatedQuery` and renders the accumulated results with the existing Inbox list components.

An `IntersectionObserver` sentinel after the final row calls `loadMore(50)` when visible. The UI displays a compact loading row while the next page loads and provides a keyboard-accessible `Load more conversations` button as a fallback. When no further page exists, neither control is shown.

Changing the agent scope resets pagination. Changing the sort order resets pagination and reads the appropriate index direction. Client-side filters continue to operate on loaded rows initially; server-backed search and filter pagination are a follow-up only if production usage shows users regularly need matches beyond loaded pages.

## Companion Reads

The agent unread total becomes a narrow aggregate or maintained summary-derived counter rather than calling the broad linked-conversation helper. Booking indicators use summary state instead of loading all linked conversations and checking sessions/events one by one.

## Verification

Focused tests will cover summary construction and synchronization for conversation, customer, booking, escalation, calendar-event, and channel-state changes; source-write rollback when synchronization fails; raw-wrapper import restrictions; migration inputs and idempotence; reconciliation detection and repair; paginated scope and sort behavior; and the Inbox load-more sentinel/button states. Run the focused suite, Convex code generation, TypeScript build, and `git diff --check`. Record production migration dry-run, reconciliation success, completion, and post-rollout Convex I/O measurements before claiming the expected reduction.
