# Workflow Automation Thread and Action History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist every successfully sent workflow Reminder and Follow-up as its exact resolved Inbox message and Action History event, with a subtle automation-specific thread card.

**Architecture:** Preserve resolved text and media from the existing WhatsApp payload builder through the provider result. A shared completion helper will ingest that result through the established agent-backed channel message path and enqueue the matching conversation log event. Structured automation-source metadata will flow from the agent message or ledger into a dedicated Inbox renderer.

**Tech Stack:** TypeScript, Convex, `@convex-dev/agent`, `@convex-dev/workpool`, React 19, Tailwind CSS, Lucide React, Vitest, `convex-test`.

## Global Constraints

- Use Node.js v22 for every script, test, lint, codegen, or build command.
- Read `convex/_generated/ai/guidelines.md` before changing Convex code.
- No code file may exceed 300 lines; create focused modules for new responsibilities.
- Do not add fallback content when resolved content is missing; fail visibly.
- Do not add empty `try`/`catch` blocks or swallow persistence failures.
- Do not add comments; keep code self-explanatory.
- Record only provider-confirmed successful sends.
- Preserve existing Workflow History status, cost accounting, cancellation, and follow-up scheduling.
- Thread styling is `border-primary/20 bg-primary/5` with a compact footer: `BellRing` + `Reminder`, or `Clock3` + `Follow-up`.

---

### Task 1: Preserve the exact provider payload presentation

**Files:**
- Modify: `convex/workflowWhatsappTemplateSender.ts`
- Create: `convex/workflowWhatsappTemplateSender.test.ts`

**Interfaces:**
- Consumes: `buildWhatsAppTemplateSendPayloadWithContent(ctx, args)` from `convex/whatsappTemplateSendPayload.ts`.
- Produces: `WorkflowWhatsappSendResult = { providerMessageId?: string; renderedContent: string; headerAsset?: BroadcastHeaderAsset }` returned by `sendWorkflowWhatsappTemplate`.

- [ ] **Step 1: Write the failing sender contract test**

```ts
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const source = readFileSync(
  new URL('./workflowWhatsappTemplateSender.ts', import.meta.url),
  'utf8',
);

test('returns the resolved content and media produced for the provider payload', () => {
  expect(source).toContain('buildWhatsAppTemplateSendPayloadWithContent');
  expect(source).toContain('renderedContent');
  expect(source).toContain('headerAsset');
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/workflowWhatsappTemplateSender.test.ts`

Expected: FAIL because the sender still calls `buildWhatsAppTemplateSendPayload` and does not return resolved content or media.

- [ ] **Step 3: Return the content-aware send result**

```ts
export type WorkflowWhatsappSendResult = {
  providerMessageId?: string;
  renderedContent: string;
  headerAsset?: BroadcastHeaderAsset;
};

const { template, renderedContent, headerAsset } =
  await buildWhatsAppTemplateSendPayloadWithContent(ctx, payloadArgs);

return {
  providerMessageId: body?.messages?.[0]?.id,
  renderedContent,
  ...(headerAsset ? { headerAsset } : {}),
};
```

The `SKIP_MESSAGE_TEMPLATE_SEND` branch must return the same shape with its generated provider ID. Reject blank `renderedContent` when there is no header asset.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/workflowWhatsappTemplateSender.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the sender contract**

```bash
git add convex/workflowWhatsappTemplateSender.ts convex/workflowWhatsappTemplateSender.test.ts
git commit -m "Preserve workflow WhatsApp send content"
```

### Task 2: Ingest successful automation sends and log Action History

**Files:**
- Create: `convex/workflowAutomationOutbound.ts`
- Create: `convex/workflowAutomationOutbound.test.ts`
- Modify: `convex/workflowReminderWorker.ts`
- Modify: `convex/workflowFollowUpWorker.ts`
- Delete after replacement: `convex/workflowAutomationMessageRecord.ts`
- Modify: `convex/workflowAutomationMessageHooks.test.ts`
- Modify: `convex/conversationLogs.ts`
- Modify: `convex/schema.ts`

**Interfaces:**
- Consumes: `ingestChannelMessage`, `logConversationEvent`, `Doc<'workflowAutomationRuns'>`, and `WorkflowWhatsappSendResult`.
- Produces: `recordWorkflowAutomationOutbound(ctx, { run, result }): Promise<void>` and the `reminder_sent` conversation-log action.

- [ ] **Step 1: Write failing tests for resolved ingestion and log metadata**

Use `convex-test` with the agent component registration pattern from `convex/senderName.test.ts`. Seed an agent, WhatsApp channel, customer, existing conversation/thread, workflow, and one run for each automation kind. Call the shared recorder with:

```ts
{
  run,
  result: {
    providerMessageId: 'wamid.workflow-reminder',
    renderedContent: 'Hi Aina, your appointment is tomorrow at 10:00 am.',
  },
}
```

Assert the stored outgoing message has exact content, `externalId`, `status: 'sent'`, and the correct `workflowAutomationSource`. Assert the enqueued conversation-log call uses:

```ts
{
  action: 'reminder_sent',
  actor: { type: 'system' },
  metadata: {
    runId: run._id,
    templateName: run.templateSnapshot.name,
  },
}
```

Repeat for Follow-up with `action: 'followup_sent'` and `attemptNumber: run.attempt`. Add a media case that maps IMAGE to `images` and VIDEO/DOCUMENT to `files`.

- [ ] **Step 2: Run the backend test and verify RED**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/workflowAutomationOutbound.test.ts`

Expected: FAIL because the shared recorder and `reminder_sent` action do not exist.

- [ ] **Step 3: Add the shared success recorder**

```ts
export async function recordWorkflowAutomationOutbound(
  ctx: MutationCtx,
  args: {
    run: Doc<'workflowAutomationRuns'>;
    result: WorkflowWhatsappSendResult;
  },
) {
  if (!args.run.conversationId || !args.run.customerId || !args.run.channelId) {
    throw new Error('Workflow automation run has no conversation delivery context');
  }
  const customer = await ctx.db.get(args.run.customerId);
  if (!customer) throw new Error('Workflow automation customer is unavailable');
  const content = args.result.renderedContent.trim();
  if (!content && !args.result.headerAsset) {
    throw new Error('Workflow automation send has no resolved content');
  }
  const source = args.run.automationKind === 'reminder'
    ? 'workflowReminder'
    : 'workflowFollowUp';
  const media = workflowHeaderAssetToIngestAttachments(args.result.headerAsset);
  const ingested = await ingestChannelMessage(ctx, {
    channelId: args.run.channelId,
    externalId: args.result.providerMessageId,
    contactAddress: customer.contactAddress,
    contactName: customer.name ?? undefined,
    direction: 'outgoing',
    content,
    contentType: 'text',
    timestampMs: Date.now(),
    assignedAgentId: args.run.agentId,
    workflowAutomationSource: source,
    ...media,
  });
  if (ingested.conversationId !== args.run.conversationId) {
    throw new Error('Workflow automation send resolved to a different conversation');
  }
  await logConversationEvent(ctx, {
    conversationId: args.run.conversationId,
    action: args.run.automationKind === 'reminder' ? 'reminder_sent' : 'followup_sent',
    actor: { type: 'system' },
    metadata: {
      runId: args.run._id,
      templateName: args.run.templateSnapshot.name,
      ...(args.run.automationKind === 'followUp'
        ? { attemptNumber: args.run.attempt }
        : {}),
    },
  });
}
```

Add `reminder_sent` to the TypeScript union, both Convex validators in `conversationLogs.ts`, and the `conversationLogs` schema validator.

- [ ] **Step 4: Route both successful completion branches through the helper**

Replace the old placeholder recorder call in each worker with:

```ts
await recordWorkflowAutomationOutbound(ctx, {
  run,
  result: args.result.returnValue,
});
```

Keep cost accounting before the run becomes `sent`, and keep Follow-up next-attempt scheduling after successful persistence.

- [ ] **Step 5: Run backend tests and verify GREEN**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/workflowAutomationOutbound.test.ts convex/workflowAutomationMessageHooks.test.ts convex/workflowAutomationSendLogging.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit backend success recording**

```bash
git add convex/workflowAutomationOutbound.ts convex/workflowAutomationOutbound.test.ts convex/workflowReminderWorker.ts convex/workflowFollowUpWorker.ts convex/workflowAutomationMessageRecord.ts convex/workflowAutomationMessageHooks.test.ts convex/conversationLogs.ts convex/schema.ts
git commit -m "Record workflow sends in conversations"
```

### Task 3: Propagate structured source metadata to the Inbox UI

**Files:**
- Create: `shared/workflowAutomationMessage.ts`
- Create: `convex/chat/workflowAutomationMessageMetadata.ts`
- Create: `convex/chat/workflowAutomationMessageMetadata.test.ts`
- Modify: `convex/chat/threads.ts`
- Modify: `convex/chat/inboxMessageMapping.ts`

**Interfaces:**
- Consumes: agent message metadata and `Doc<'messages'>['workflowAutomationSource']`.
- Produces: `WorkflowAutomationSource`, `resolveWorkflowAutomationSource(agentMetadata, ledger)`, and `InboxUIMessage.workflowAutomationSource`.

- [ ] **Step 1: Write failing metadata-resolution tests**

```ts
test('prefers agent workflow source and falls back to the ledger', () => {
  expect(resolveWorkflowAutomationSource(
    { workflowAutomationSource: 'workflowReminder' },
    { workflowAutomationSource: 'workflowFollowUp' },
  )).toBe('workflowReminder');
  expect(resolveWorkflowAutomationSource(
    {},
    { workflowAutomationSource: 'workflowFollowUp' },
  )).toBe('workflowFollowUp');
});
```

- [ ] **Step 2: Run the metadata test and verify RED**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/chat/workflowAutomationMessageMetadata.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement metadata propagation**

Define the shared source union, store `workflowAutomationSource` in `saveHumanReply` agent metadata from `ingestChannelMessage`, resolve agent-first/ledger-second in `messageDocsToInboxUIMessages`, and expose it on `InboxUIMessage`.

```ts
export function resolveWorkflowAutomationSource(
  agentMetadata: WorkflowAutomationAgentMetadata,
  ledger: WorkflowAutomationLedgerMetadata | undefined,
) {
  return agentMetadata.workflowAutomationSource ?? ledger?.workflowAutomationSource;
}
```

- [ ] **Step 4: Run the metadata test and verify GREEN**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/chat/workflowAutomationMessageMetadata.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit Inbox metadata propagation**

```bash
git add shared/workflowAutomationMessage.ts convex/chat/workflowAutomationMessageMetadata.ts convex/chat/workflowAutomationMessageMetadata.test.ts convex/chat/threads.ts convex/chat/inboxMessageMapping.ts
git commit -m "Expose workflow message source in Inbox"
```

### Task 4: Render a subtly distinct workflow automation card

**Files:**
- Create: `src/components/inbox/InboxWorkflowAutomationMessage.tsx`
- Create: `src/components/inbox/InboxWorkflowAutomationMessage.test.ts`
- Modify: `src/components/inbox/InboxThreadMessages.tsx`

**Interfaces:**
- Consumes: `WorkflowAutomationSource`, rendered message children, and the existing attachment rendering performed by `InboxThreadMessageContent`.
- Produces: `InboxWorkflowAutomationMessage({ source, children })`.

- [ ] **Step 1: Write the failing presentation contract test**

Read the new component and thread renderer as source. Assert the component contains `border-primary/20`, `bg-primary/5`, `BellRing`, `Clock3`, `Reminder`, and `Follow-up`. Assert `InboxThreadMessages.tsx` branches on `message.workflowAutomationSource` and renders `InboxWorkflowAutomationMessage`.

- [ ] **Step 2: Run the UI test and verify RED**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/inbox/InboxWorkflowAutomationMessage.test.ts`

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the focused card**

```tsx
export function InboxWorkflowAutomationMessage({
  source,
  children,
}: {
  source: WorkflowAutomationSource;
  children: ReactNode;
}) {
  const isReminder = source === 'workflowReminder';
  const Icon = isReminder ? BellRing : Clock3;
  return (
    <div className="ml-auto w-fit min-w-48 max-w-full overflow-hidden rounded-md border border-primary/20 bg-primary/5 text-foreground">
      <div className="flex flex-col gap-1.5 p-2 text-sm leading-snug">
        {children}
      </div>
      <Separator />
      <div className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium text-muted-foreground">
        <Icon className="size-3" />
        <span>{isReminder ? 'Reminder' : 'Follow-up'}</span>
      </div>
    </div>
  );
}
```

For workflow messages, pass the existing audio, image, file, and WhatsApp-formatted text nodes into the card body. Render text without the ordinary blue outgoing bubble so the card is the single visual container. Keep delivery status, timestamp, reactions, and controls outside the card exactly where they are today.

- [ ] **Step 4: Run the UI test and verify GREEN**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/inbox/InboxWorkflowAutomationMessage.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the thread presentation**

```bash
git add src/components/inbox/InboxWorkflowAutomationMessage.tsx src/components/inbox/InboxWorkflowAutomationMessage.test.ts src/components/inbox/InboxThreadMessages.tsx
git commit -m "Distinguish workflow messages in Inbox"
```

### Task 5: Render both Action History actions and verify the integrated feature

**Files:**
- Create: `src/components/inbox/conversationActionHistoryPresentation.tsx`
- Create: `src/components/inbox/conversationActionHistoryPresentation.test.ts`
- Modify: `src/pages/ChatsPage.tsx`
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: conversation-log action and metadata.
- Produces: `formatConversationActionHistoryText(action, metadata)` and `getConversationActionHistoryStyle(action)` used by `ChatsPage`.

- [ ] **Step 1: Write failing Action History presentation tests**

Assert `reminder_sent` formats `Reminder sent: "appointment_reminder"`; assert `followup_sent` formats the template and attempt number; assert both styles use automation-appropriate Lucide icons without changing existing action mappings.

- [ ] **Step 2: Run the Action History test and verify RED**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/inbox/conversationActionHistoryPresentation.test.ts`

Expected: FAIL because Reminder presentation is absent and the focused module does not exist.

- [ ] **Step 3: Extract and extend the presentation helpers**

Move the existing action text/style switches out of `ChatsPage.tsx` into the focused module without changing existing output. Add `reminder_sent` using `BellRing` and retain `followup_sent` using `Clock3`.

- [ ] **Step 4: Run focused and regression tests**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/workflowWhatsappTemplateSender.test.ts convex/workflowAutomationOutbound.test.ts convex/workflowAutomationMessageHooks.test.ts convex/workflowAutomationSendLogging.test.ts convex/chat/workflowAutomationMessageMetadata.test.ts src/components/inbox/InboxWorkflowAutomationMessage.test.ts src/components/inbox/conversationActionHistoryPresentation.test.ts src/components/inbox/InboxBroadcastMessage.test.ts`

Expected: PASS with no warnings or unhandled errors.

- [ ] **Step 5: Run proportional verification**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint convex/workflowWhatsappTemplateSender.ts convex/workflowAutomationOutbound.ts convex/workflowReminderWorker.ts convex/workflowFollowUpWorker.ts convex/conversationLogs.ts convex/chat/workflowAutomationMessageMetadata.ts convex/chat/threads.ts convex/chat/inboxMessageMapping.ts shared/workflowAutomationMessage.ts src/components/inbox/InboxWorkflowAutomationMessage.tsx src/components/inbox/conversationActionHistoryPresentation.tsx src/components/inbox/InboxThreadMessages.tsx src/pages/ChatsPage.tsx`

Expected: exit 0 with no new warnings.

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx convex codegen`

Expected: exit 0 and generated API types remain valid.

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bun run build`

Expected: TypeScript and Vite build pass.

Run: `git diff --check`

Expected: no whitespace errors.

Check every created or modified code file with `wc -l`; no new focused code file may exceed 300 lines.

- [ ] **Step 6: Update continuity and commit the integrated feature**

Record the completed behavior, decisions, working set, and verification receipt in `CONTINUITY.md` while preserving its section caps.

```bash
git add src/components/inbox/conversationActionHistoryPresentation.tsx src/components/inbox/conversationActionHistoryPresentation.test.ts src/pages/ChatsPage.tsx CONTINUITY.md convex/_generated/api.d.ts
git commit -m "Show workflow sends in thread history"
```
