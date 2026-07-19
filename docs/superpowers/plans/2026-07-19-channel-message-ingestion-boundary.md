# Channel Message Ingestion Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make channel message ingestion persistence-only while keeping analytics, workflow activity, mark-seen, and AI enqueueing explicit at every production caller.

**Architecture:** `ingestChannelMessage` returns the persisted message IDs and performs no post-ingestion work. Thin internal mutation wrappers expose only that persistence contract. Each live, historical, widget, broadcast, and follow-up caller invokes the existing focused side-effect primitives it requires, in visible sequence, without a shared orchestration wrapper.

**Tech Stack:** Convex mutations/actions and scheduler, TypeScript, Vitest, convex-test, Workpool.

## Global Constraints

- Work on `main` as explicitly authorized by the user.
- Preserve the uncommitted WhatsApp analytics-timeout Stage 1 changes already present in the same files.
- Do not introduce `processLiveChannelMessage`, `handlePostIngestion`, a callback registry, or any equivalent orchestration wrapper.
- `ingestChannelMessage` owns only deduplication, channel validation, customer/conversation/Agent/local-message persistence, and `lastConversationId`.
- Historical ingestion never enqueues mark-seen or AI work.
- Web Widget ingestion never enqueues Meta mark-seen work.
- Keep authored code files at or below 300 lines; do not expand `convex/chat/threads.ts` or `convex/chat/inbox.ts` with new responsibilities.
- Add no code comments.
- Use Node v22 for every script and test command.
- Do not stage or commit implementation files unless the user separately requests it because approved Stage 1 edits overlap them.

---

### Task 1: Make the ingestion contract persistence-only

**Files:**
- Modify: `convex/chat/threads.ts:1019-1248`
- Modify: `convex/chat/inbox.ts:78-135`
- Modify: `convex/doubleSave.test.ts:108-220`

**Interfaces:**
- Consumes: `ingestChannelMessage(ctx: MutationCtx, args: IngestChannelMessageArgs)`.
- Produces: the existing result fields plus `messageIds: Id<"messages">[]`; both internal ingestion mutations return this result without adding side effects.

- [ ] **Step 1: Write the failing persistence-boundary assertions**

In the direct-ingestion test, freeze timers before ingestion and assert that the returned IDs match the local records and that ingestion creates no analytics request:

```ts
vi.useFakeTimers();

const result = await t.mutation(
  internal.chat.inbox.internalIngestChannelMessage,
  {
    channelId,
    externalId: "ext-msg-123",
    contactAddress: "+60123456789",
    contactName: "John Doe",
    direction: "incoming",
    content: "Hello there",
    contentType: "text",
    timestampMs: Date.now(),
    isHistorical: true,
  },
);

const ingestionState = await t.run(async (ctx) => {
  const messages = await ctx.db
    .query("messages")
    .withIndex("by_externalId", (q) => q.eq("externalId", "ext-msg-123"))
    .collect();
  const analyticsRequests = await ctx.db
    .query("conversationAnalyticsRefreshRequests")
    .collect();
  return { messages, analyticsRequests };
});

expect(result.messageIds).toEqual(
  ingestionState.messages.map((message) => message._id),
);
expect(ingestionState.analyticsRequests).toHaveLength(0);
```

Restore real timers after the test.

- [ ] **Step 2: Run the boundary test to verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/doubleSave.test.ts -t "Incoming message is saved exactly once"
```

Expected: FAIL because `messageIds` is not returned and direct ingestion creates an analytics refresh request.

- [ ] **Step 3: Return message IDs and remove post-ingestion work**

Change the return type and result in `ingestChannelMessage`:

```ts
export type IngestChannelMessageResult = {
  conversationId: Id<"conversations">;
  messageIds: Id<"messages">[];
  skipped: boolean;
  shouldEnqueueAi?: boolean;
  isNew?: boolean;
  agentMessageId?: string;
};
```

For deduplicated ingestion, return an empty message list:

```ts
return {
  conversationId: existingLedger.conversationId,
  messageIds: [],
  skipped: true,
  shouldEnqueueAi: false,
};
```

After message persistence, keep only the customer update:

```ts
await ctx.runMutation(internal.customers.internalSetLastConversation, {
  customerId,
  conversationId,
});

return {
  conversationId,
  messageIds,
  skipped: false,
  shouldEnqueueAi:
    !args.isHistorical &&
    args.direction === "incoming" &&
    Boolean(
      agentMessageId &&
        (trimmedContent.length > 0 || images.length > 0 || files.length > 0),
    ),
  isNew,
  agentMessageId,
};
```

Remove the analytics and workflow imports from `threads.ts`.

Make both internal wrappers thin:

```ts
export const internalIngestChannelMessage = internalMutation({
  args: ingestChannelMessageArgs,
  handler: async (ctx, args) => {
    return await ingestChannelMessage(ctx, args);
  },
});

export const internalIngestHistoricalChannelMessage = internalMutation({
  args: ingestChannelMessageArgs,
  handler: async (ctx, args) => {
    return await ingestChannelMessage(ctx, args);
  },
});
```

- [ ] **Step 4: Run the boundary test to verify GREEN**

Run the Task 1 command again.

Expected: PASS; direct ingestion returns local message IDs and creates no analytics request.

### Task 2: Make WhatsApp live and echo post-ingestion work explicit

**Files:**
- Modify: `convex/whatsappWebhook.ts:780-900`
- Modify: `convex/doubleSave.test.ts`
- Modify: `convex/whatsappWebhookReceive.test.ts`

**Interfaces:**
- Consumes: `IngestChannelMessageResult`, `requestConversationAnalyticsRefresh`, `handleWorkflowAutomationMessageActivity`, `metaIndicatorPool`, and `inboxAiReplyPool`.
- Produces: explicit WhatsApp echo and live-incoming sequences with Stage 1 HTTP retry behavior unchanged.

- [ ] **Step 1: Add a live WhatsApp regression test**

Create an AI-routable WhatsApp channel fixture, call:

```ts
const result = await t.mutation(internal.whatsappWebhook.handleIncoming, {
  phoneNumberId: "phone-id-123",
  externalId: "live-whatsapp-1",
  from: "+60123456789",
  timestampMs: Date.now(),
  content: "Help me",
  profileName: "Jane Doe",
});
```

Assert one analytics request exists and both Workpools contain one work record:

```ts
const analyticsRequests = await t.run(async (ctx) => {
  return await ctx.db
    .query("conversationAnalyticsRefreshRequests")
    .collect();
});
const aiWork = await withComponents(t).runInComponent(
  "inboxAiReplyWorkpool",
  async (ctx) => await ctx.db.query("work").collect(),
);
const indicatorWork = await withComponents(t).runInComponent(
  "metaIndicatorWorkpool",
  async (ctx) => await ctx.db.query("work").collect(),
);

expect(analyticsRequests).toHaveLength(1);
expect(aiWork).toHaveLength(1);
expect(indicatorWork).toHaveLength(1);
expect(result?.skipped).toBe(false);
```

- [ ] **Step 2: Run the WhatsApp regression test**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/doubleSave.test.ts convex/whatsappWebhookReceive.test.ts
```

Expected after Task 1: FAIL because `handleIncoming` no longer receives post-ingestion behavior from the pure internal mutation.

- [ ] **Step 3: Add explicit WhatsApp post-ingestion steps**

After WhatsApp Business echo ingestion, return on `skipped`, then call:

```ts
await requestConversationAnalyticsRefresh(ctx, result.conversationId);
await handleWorkflowAutomationMessageActivity(ctx, {
  conversationId: result.conversationId,
  direction: "outgoing",
  isHistorical: false,
  messageIds: result.messageIds,
});
```

After live incoming ingestion, return on `skipped`, request analytics, process workflow activity, load the conversation, then enqueue the two actions explicitly:

```ts
await requestConversationAnalyticsRefresh(ctx, result.conversationId);
await handleWorkflowAutomationMessageActivity(ctx, {
  conversationId: result.conversationId,
  direction: "incoming",
  isHistorical: false,
  messageIds: result.messageIds,
});

if (result.shouldEnqueueAi) {
  const conversation = await ctx.db.get(result.conversationId);
  if (
    conversation?.assignToAiAgent &&
    conversation.assignedAgentId
  ) {
    await metaIndicatorPool.enqueueAction(
      ctx,
      internal.chat.inboxActions.internalSendMetaMarkSeen,
      {
        conversationId: result.conversationId,
        messageExternalId: args.externalId,
        requireAiHandled: true,
      },
    );
    await inboxAiReplyPool.enqueueAction(
      ctx,
      internal.chat.inbox.generateAiReplyWorker,
      {
        conversationId: result.conversationId,
        promptContent: inboxPromptContent(
          args.content,
          undefined,
          args.files,
        ),
        promptMessageId: result.agentMessageId,
        inboundExternalId: args.externalId,
      },
    );
  }
}
```

Return `result` from `handleIncoming`.

- [ ] **Step 4: Run the WhatsApp tests to verify GREEN**

Run the Task 2 command again.

Expected: PASS, including HTTP 500 on core ingestion failure and HTTP 200 on successful persistence.

### Task 3: Make Instagram, Messenger, and Web Widget sequencing explicit

**Files:**
- Modify: `convex/instagramWebhook.ts:180-230`
- Modify: `convex/messengerWebhook.ts:235-285`
- Modify: `convex/webWidget.ts:165-215`
- Modify: `convex/webWidget.test.ts:219-285`
- Test: relevant existing webhook and widget tests discovered by `rg`

**Interfaces:**
- Consumes: the Task 1 ingestion result and the same focused analytics/workflow/Workpool primitives.
- Produces: visible post-ingestion sequences for live Instagram, Messenger, and Web Widget messages.

- [ ] **Step 1: Add post-ingestion assertions**

Extend the Web Widget conversation-reuse test to freeze timers and assert that receiving a non-skipped message creates one analytics request:

```ts
const analyticsRequests = await t.run(async (ctx) => {
  return await ctx.db
    .query("conversationAnalyticsRefreshRequests")
    .collect();
});

expect(analyticsRequests).toHaveLength(2);
```

Keep the existing AI Workpool assertion for Web Widget and assert there is no `metaIndicatorWorkpool` work when that component is registered.

Add or extend focused Instagram and Messenger webhook tests to assert that an eligible live inbound message creates analytics, mark-seen, and AI work after ingestion.

- [ ] **Step 2: Run live-channel tests to verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/webWidget.test.ts convex/doubleSave.test.ts
```

Expected after Task 1: FAIL on missing analytics requests or Workpool work.

- [ ] **Step 3: Add explicit live-channel post-ingestion code**

For Instagram and Messenger, assign the ingestion result, return when skipped, then visibly call analytics and workflow activity before the existing eligibility check and Workpool enqueue calls:

```ts
await requestConversationAnalyticsRefresh(ctx, result.conversationId);
await handleWorkflowAutomationMessageActivity(ctx, {
  conversationId: result.conversationId,
  direction: "incoming",
  isHistorical: false,
  messageIds: result.messageIds,
});
```

For Web Widget, add the same analytics and workflow calls immediately after ingestion and before its existing AI block:

```ts
if (!result.skipped) {
  await requestConversationAnalyticsRefresh(ctx, result.conversationId);
  await handleWorkflowAutomationMessageActivity(ctx, {
    conversationId: result.conversationId,
    direction: "incoming",
    isHistorical: false,
    messageIds: result.messageIds,
  });
}
```

Do not add Meta mark-seen work to Web Widget.

- [ ] **Step 4: Run live-channel tests to verify GREEN**

Run the Task 3 command again.

Expected: PASS with live-channel AI behavior preserved and Web Widget still free of Meta mark-seen work.

### Task 4: Make historical synchronization explicit and AI-free

**Files:**
- Modify: `convex/whatsappSync.ts:575-602`
- Modify: `convex/instagramSync.ts:350-400`
- Modify: `convex/messengerSync.ts:330-380`
- Modify: `convex/doubleSave.test.ts:221-345`

**Interfaces:**
- Consumes: pure ingestion and `internal.analyticsRefreshRequest.request` for action callers or `requestConversationAnalyticsRefresh` for mutation callers.
- Produces: historical persistence followed only by analytics requests.

- [ ] **Step 1: Add historical analytics assertions**

Keep the direct internal historical-ingestion test persistence-only by asserting zero analytics requests. Add a sync-caller test that runs a historical synchronization entrypoint and asserts the touched conversation receives an analytics refresh request while AI and indicator Workpools stay empty.

- [ ] **Step 2: Run historical tests to verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/doubleSave.test.ts
```

Expected after Task 1: the direct persistence-only assertion passes, while the sync-caller analytics assertion fails.

- [ ] **Step 3: Add explicit historical analytics requests**

In the WhatsApp sync action, after each non-skipped ingest:

```ts
await ctx.runMutation(internal.analyticsRefreshRequest.request, {
  conversationId: result.conversationId,
});
touchedConversations.add(result.conversationId);
```

In Instagram and Messenger historical mutation handlers:

```ts
if (!result.skipped) {
  await requestConversationAnalyticsRefresh(ctx, result.conversationId);
}
return result;
```

Remove the unreachable historical AI eligibility branches and their unused `inboxAiReplyPool` and `inboxPromptContent` imports.

- [ ] **Step 4: Run historical tests to verify GREEN**

Run the Task 4 command again.

Expected: PASS; historical callers request analytics explicitly and enqueue no AI or mark-seen work.

### Task 5: Preserve outbound broadcast and follow-up behavior

**Files:**
- Modify: `convex/broadcastPool.ts:165-225`
- Modify: `convex/followUpPool.ts:155-225`
- Modify: `convex/whatsappFollowUp.test.ts`
- Modify: relevant broadcast tests discovered by `rg`

**Interfaces:**
- Consumes: pure ingestion, `requestConversationAnalyticsRefresh`, and `handleWorkflowAutomationMessageActivity`.
- Produces: explicit analytics and outbound workflow activity after successful non-skipped sends.

- [ ] **Step 1: Add outbound side-effect assertions**

After a successful broadcast or follow-up completion, assert one analytics refresh request exists for the ingested conversation. Keep existing event/history assertions.

- [ ] **Step 2: Run outbound tests to verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/whatsappFollowUp.test.ts convex/workflowAutomationOutbound.test.ts
```

Expected after Task 1: FAIL because pure ingestion no longer schedules analytics or workflow activity.

- [ ] **Step 3: Add explicit outbound post-ingestion calls**

After each non-skipped broadcast or follow-up ingest:

```ts
await requestConversationAnalyticsRefresh(
  ctx,
  ingestResult.conversationId,
);
await handleWorkflowAutomationMessageActivity(ctx, {
  conversationId: ingestResult.conversationId,
  direction: "outgoing",
  isHistorical: false,
  messageIds: ingestResult.messageIds,
});
```

Keep logging and recipient/follow-up state updates in their existing order.

- [ ] **Step 4: Run outbound tests to verify GREEN**

Run the Task 5 command again.

Expected: PASS with analytics and workflow behavior preserved.

### Task 6: Verify the complete boundary and deployment bindings

**Files:**
- Modify: `CONTINUITY.md`
- Modify if generated: `convex/_generated/api.d.ts`

**Interfaces:**
- Consumes: all prior tasks.
- Produces: verified Convex bindings, focused regression evidence, and an updated continuity record.

- [ ] **Step 1: Scan the ingestion primitive for forbidden side effects**

Run:

```bash
sed -n '1019,1250p' convex/chat/threads.ts
sed -n '78,140p' convex/chat/inbox.ts
rg -n 'requestConversationAnalyticsRefresh|handleWorkflowAutomationMessageActivity|enqueueAction' convex/chat/threads.ts
```

Expected: no analytics, workflow, or enqueue call in `ingestChannelMessage`; both internal wrappers only return the ingestion result.

- [ ] **Step 2: Run focused verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/doubleSave.test.ts convex/analyticsRefresh.test.ts convex/whatsappWebhookReceive.test.ts convex/webWidget.test.ts convex/whatsappFollowUp.test.ts convex/workflowAutomationOutbound.test.ts
```

Expected: all selected files and tests pass.

- [ ] **Step 3: Run targeted lint**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint convex/chat/threads.ts convex/chat/inbox.ts convex/whatsappWebhook.ts convex/instagramWebhook.ts convex/messengerWebhook.ts convex/webWidget.ts convex/whatsappSync.ts convex/instagramSync.ts convex/messengerSync.ts convex/broadcastPool.ts convex/followUpPool.ts convex/doubleSave.test.ts convex/webWidget.test.ts convex/whatsappFollowUp.test.ts
```

Expected: exit code 0.

- [ ] **Step 4: Regenerate and upload Convex bindings**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx convex codegen
```

Expected: bundling, upload, generated TypeScript, and TypeScript check all complete successfully.

- [ ] **Step 5: Run final integrity checks**

Run:

```bash
git diff --check
wc -l convex/analyticsRefreshRequest.ts convex/analyticsRefreshWorker.ts
git status --short
```

Expected: no whitespace errors; authored modules remain below 300 lines; status contains only intentional Stage 1 and ingestion-boundary changes.

- [ ] **Step 6: Update the continuity ledger**

Record the final boundary, exact verification results, configured-deployment upload, working set, and any remaining Stage 2 analytics limitation in `CONTINUITY.md`.

