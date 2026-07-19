# WhatsApp Analytics Timeout Stage 1 Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Decouple expensive conversation analytics from incoming message persistence and make webhook retries safe.

**Architecture:** Add a per-conversation revisioned refresh request. The message mutation updates that request and atomically schedules a post-commit worker. The latest worker runs the existing analytics handler; stale workers return immediately. Track incoming persistence failures in the HTTP action and return 500 after the batch.

**Tech Stack:** Convex mutations and scheduler, TypeScript, Vitest, convex-test.

---

### Task 1: Specify delivery and coalescing behavior with failing tests

**Files:**
- Create: `convex/analyticsRefresh.test.ts`
- Create: `convex/whatsappWebhookReceive.test.ts`

**Step 1: Write the failing analytics request tests**

Add tests that call the internal refresh-request mutation multiple times and assert there is only one request row with an incremented revision. Add a scheduled-worker test that verifies stale revisions preserve the request and the latest revision clears it after analytics synchronization.

**Step 2: Write the failing HTTP response test**

Call `receive` with a minimal incoming WhatsApp payload and an action context whose persistence mutation throws. Assert the response status is 500. Add the successful equivalent with status 200.

**Step 3: Run the focused tests**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/analyticsRefresh.test.ts convex/whatsappWebhookReceive.test.ts
```

Expected: FAIL because the refresh module/table do not exist and the current webhook returns 200 after a persistence failure.

### Task 2: Add the durable coalesced refresh handoff

**Files:**
- Modify: `convex/schema.ts`
- Create: `convex/analyticsRefreshRequest.ts`
- Create: `convex/analyticsRefreshWorker.ts`
- Modify: `convex/analytics.ts`
- Modify: `convex/chat/threads.ts`

**Step 1: Add the request table**

Define `conversationAnalyticsRefreshRequests` with `conversationId`, `revision`, `requestedAt`, and a unique-query index named `by_conversationId`.

**Step 2: Add the request helper**

Implement a helper that upserts the request, increments its revision, and calls `ctx.scheduler.runAfter(0, internal.analyticsRefreshWorker.run, { requestId, revision })`.

Expose an internal mutation wrapper for focused tests.

**Step 3: Add the worker**

Load the request by ID. Return when missing or stale. Invoke the existing analytics handler for the matching revision, re-read the request, and delete it only when the revision still matches.

**Step 4: Make the analytics handler reusable**

Export `syncConversationAnalyticsHandler` without changing its behavior.

**Step 5: Change message ingestion**

Replace the synchronous `internal.analytics.syncConversationAnalytics` call in `ingestChannelMessage` with the refresh-request helper. Route human replies, AI text/media replies, and inbox escalation updates through the same helper so the scheduled worker cannot overlap a second inbox rebuild. Preserve workflow activity ordering and all existing return values.

### Task 3: Correct the webhook response

**Files:**
- Modify: `convex/whatsappWebhook.ts`

**Step 1: Track core persistence failure**

Set a batch-level failure flag only when `handleIncoming` throws.

**Step 2: Return the retryable status**

Return HTTP 500 when the flag is set and HTTP 200 otherwise.

### Task 4: Verify Stage 1

**Files:**
- Modify: `CONTINUITY.md`

**Step 1: Run focused tests**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/analyticsRefresh.test.ts convex/whatsappWebhookReceive.test.ts convex/analytics.test.ts convex/doubleSave.test.ts
```

**Step 2: Regenerate Convex types**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx convex codegen
```

**Step 3: Re-run focused tests and checks**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/analyticsRefresh.test.ts convex/whatsappWebhookReceive.test.ts convex/analytics.test.ts convex/doubleSave.test.ts
```

Run `git diff --check`, inspect changed code file lengths, and review the final diff.

**Step 4: Record evidence**

Update `CONTINUITY.md` with the design decision, changed state, working set, and exact verification outcomes.
