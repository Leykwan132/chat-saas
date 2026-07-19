# WhatsApp Analytics Timeout Stage 1 Design

## Goal

Incoming WhatsApp messages must commit even when conversation analytics exceeds Convex system-operation limits.

## Current failure

The incoming-message mutation stores the customer, conversation, Agent thread message, and local message, then synchronously rebuilds conversation analytics. The analytics rebuild reads up to 500 messages, deletes up to 200 metric rows, recreates metric rows, and invokes aggregate triggers for those writes. When that work exceeds the mutation budget, Convex rolls back the entire transaction. The HTTP handler currently catches the error and still returns 200, so Meta can treat a lost message as delivered.

## Stage 1 boundary

The message transaction remains responsible for:

1. External-ID deduplication.
2. Channel resolution.
3. Customer and conversation upsert.
4. Agent thread message persistence.
5. Local message persistence.
6. Customer `lastConversationId` update.
7. Workflow message activity.
8. Durable scheduling of analytics refresh work.

Analytics calculation and metric-row rebuilding move to a scheduled mutation that runs after the message transaction commits. Incoming ingestion, human replies, AI text/media replies, and inbox escalation updates all use the same handoff so they cannot start competing synchronous rebuilds.

## Coalescing model

`conversationAnalyticsRefreshRequests` contains at most one active request per conversation. Each request has a monotonically increasing `revision`.

Every committed message:

1. Creates or increments the conversation request.
2. Schedules a worker carrying the request ID and revision.

A worker exits when its revision is stale. Only the worker whose revision matches the current request rebuilds analytics and deletes the request. A failed analytics rebuild leaves the request intact. A later message increments the revision and schedules another attempt.

This design may create several cheap scheduled invocations during a burst, but only the latest valid invocation performs the expensive rebuild.

## HTTP delivery semantics

The webhook continues processing all messages in a batch. If any incoming-message persistence call fails, the endpoint returns 500 after processing the batch. Meta can retry the payload, while external-ID deduplication makes already committed messages no-ops. Status-update and unrelated webhook failures retain their existing handling.

## Non-goals

- Replacing rebuild-based analytics with incremental counters.
- Changing the 500-message analytics window.
- Enabling the currently disabled Meta HMAC verification.
- Moving non-inbox analytics callsites to the new queue.

## Acceptance criteria

- Message persistence no longer synchronously calls conversation analytics.
- Repeated refresh requests for one conversation leave one request row.
- Stale workers do not rebuild or delete the latest request.
- The latest worker rebuilds analytics and clears the request.
- Incoming-message persistence failure produces HTTP 500.
- A successful webhook batch produces HTTP 200.
- External-ID retries remain idempotent.
