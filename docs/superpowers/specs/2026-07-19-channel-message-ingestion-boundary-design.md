# Channel Message Ingestion Boundary Design

## Goal

Make `ingestChannelMessage` and `internalIngestChannelMessage` responsible only for persisting a channel message and the records required to represent it. Keep every post-ingestion action visible at the caller without introducing a shared orchestration wrapper.

## Responsibility boundary

### Ingestion

`ingestChannelMessage` owns:

1. External-ID deduplication.
2. Channel validation.
3. Customer upsert.
4. Conversation and routing upsert.
5. Agent thread message persistence.
6. Local text, image, and file message persistence.
7. Customer `lastConversationId` update.

It returns:

```ts
{
  conversationId,
  messageIds,
  agentMessageId,
  skipped,
  shouldEnqueueAi,
  isNew,
}
```

`internalIngestChannelMessage` and `internalIngestHistoricalChannelMessage` remain thin Convex mutation wrappers around this persistence function. They do not read the conversation after ingestion, schedule analytics, process workflow activity, mark messages seen, or enqueue AI work.

### Post-ingestion work

Callers explicitly invoke the focused shared primitives they require:

- `requestConversationAnalyticsRefresh`
- `handleWorkflowAutomationMessageActivity`
- `metaIndicatorPool.enqueueAction`
- `inboxAiReplyPool.enqueueAction`

There is no `processLiveChannelMessage`, `handlePostIngestion`, callback registry, or other wrapper that hides the sequence.

## Caller behavior

| Caller | Analytics | Workflow activity | Mark seen | AI reply |
| --- | --- | --- | --- | --- |
| WhatsApp live incoming | Yes | Yes | Yes | When eligible |
| Instagram live incoming | Yes | Yes | Yes | When eligible |
| Messenger live incoming | Yes | Yes | Yes | When eligible |
| Web Widget incoming | Yes | Yes | No | When eligible |
| WhatsApp Business echo | Yes | Yes | No | No |
| WhatsApp history sync | Yes | No | No | No |
| Instagram history sync | Yes | No | No | No |
| Messenger history sync | Yes | No | No | No |
| Broadcast completion | Yes | Yes | No | No |
| Legacy follow-up completion | Yes | Yes | No | No |

Tests and internal diagnostic callers that invoke ingestion directly observe persistence only.

## Live Meta channel sequence

Each live Meta handler makes the order readable in its own function:

```ts
const result = await ctx.runMutation(
  internal.chat.inbox.internalIngestChannelMessage,
  ingestArgs,
);

if (result.skipped) return result;

await requestConversationAnalyticsRefresh(ctx, result.conversationId);
await handleWorkflowAutomationMessageActivity(ctx, {
  conversationId: result.conversationId,
  direction: ingestArgs.direction,
  isHistorical: false,
  messageIds: result.messageIds,
});

if (result.shouldEnqueueAi) {
  const conversation = await ctx.db.get(result.conversationId);
  if (conversation?.assignToAiAgent && conversation.assignedAgentId) {
    await metaIndicatorPool.enqueueAction(...);
    await inboxAiReplyPool.enqueueAction(...);
  }
}
```

The existing focused primitives and Workpool instances are shared. The orchestration sequence is intentionally repeated at each channel boundary instead of hidden behind another abstraction.

## Historical and outbound paths

Historical callers request analytics explicitly after a successful ingest. They do not run workflow message activity because the existing workflow helper is a no-op for historical messages, and they never enqueue mark-seen or AI work.

Broadcast, follow-up, and WhatsApp Business echo callers explicitly request analytics and run outbound workflow activity after successful ingestion. They do not enqueue mark-seen or AI work.

## Atomicity and failures

For mutation callers, ingestion and post-ingestion scheduling remain in the same outer Convex transaction. If the caller fails before commit, none of its writes, scheduler entries, or Workpool enqueues commit.

The WhatsApp webhook keeps its Stage 1 delivery behavior: a core ingestion failure makes the HTTP batch return 500. Analytics remains scheduled post-commit and cannot roll back an already committed message.

Deduplicated retries return `skipped: true`. Callers perform no post-ingestion work for skipped results, preventing duplicate AI and workflow actions.

## Testing

Regression coverage will prove:

1. Direct internal ingestion persists messages but creates no analytics request and no Workpool work.
2. Direct ingestion returns the inserted `messageIds`.
3. Live WhatsApp ingestion still requests analytics, runs workflow activity, and enqueues mark-seen and AI work when eligible.
4. Historical ingestion remains AI-free and requests analytics explicitly from its sync caller.
5. Web Widget still enqueues AI without Meta mark-seen.
6. Broadcast and follow-up paths retain analytics and outbound workflow behavior.
7. Existing external-ID retry behavior remains idempotent.

## Non-goals

- Adding a new orchestration function or module.
- Changing AI eligibility rules.
- Changing workflow follow-up behavior.
- Changing the analytics refresh worker.
- Changing message, customer, conversation, or Agent component schemas.

