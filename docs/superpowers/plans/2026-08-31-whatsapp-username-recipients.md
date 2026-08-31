# WhatsApp Username Recipient Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Receive WhatsApp username-opted contacts identified by provider user IDs and send every customer-addressed WhatsApp message with `recipient` rather than `to` for those contacts.

**Architecture:** Store the provider identity and opted-in username on the existing customer record while retaining the existing `(orgId, service, contactAddress)` natural key. Carry these optional values through the webhook ingestion boundary. A single recipient builder owns the mutually exclusive Meta addressing contract and is used by inbox, workflow, and broadcast senders.

**Tech Stack:** Convex schema/functions, TypeScript, Vitest, Meta WhatsApp Cloud API.

**Spec:** `docs/superpowers/specs/2026-08-31-whatsapp-username-recipients-design.md`

## Global Constraints

- Run every script and test through `source ~/.nvm/nvm.sh && nvm use 22`.
- Follow `convex/_generated/ai/guidelines.md` for every Convex schema/function change.
- Keep code files at or below 300 lines and avoid comments in production code.
- Phone contacts send only `{ to: normalizedPhone }`; username-opted contacts send only `{ recipient: whatsappUserId }`.
- Do not infer a phone number from a provider user ID or place one in `customers.phone`.
- Meta `system.user_changed_user_id` and `system.user_changed_number` events update an existing matched customer's BSUID and linked WhatsApp conversation addresses without creating an inbox message.
- This feature remains out of the release changelog until its production availability date is confirmed.

---

## File map

- `convex/schema.ts`: add optional WhatsApp provider identity fields to `customers`.
- `convex/customers.ts`: retain username identity during customer upsert and expose a human-readable broadcast target label.
- `convex/chat/threads.ts` and `convex/chat/inbox.ts`: carry username identity through the typed internal inbound boundary and provide the customer in outbound context.
- `convex/whatsappWebhook.ts`: normalize legacy and username-only webhook identities before persistence.
- `convex/whatsappRecipient.ts`: create the only reusable Meta recipient builder.
- `convex/chat/channelSend.ts` and `convex/chat/inboxActions.ts`: use the recipient builder for human, AI, media, and reaction sends.
- `convex/{broadcastPool.ts,workflowWhatsappTemplateSender.ts,whatsappBroadcast.ts,whatsappSend.ts}`: use the recipient builder for template/broadcast/freeform sends.
- `convex/{whatsappWebhookReceive.test.ts,chat/channelSend.test.ts,workflowWhatsappTemplateSender.test.ts}`: behavioral regression coverage for the new transport contract.
- `convex/whatsappUserIdChange.test.ts`: database-level regression coverage for BSUID-change continuity.

### Task 1: Persist and ingest username-only identity

**Files:**

- Modify: `convex/schema.ts:customers`
- Modify: `convex/customers.ts:internalUpsertFromWebhook, upsertCustomer`
- Modify: `convex/chat/threads.ts:ingestChannelMessageArgs, ingestChannelMessage`
- Modify: `convex/whatsappWebhook.ts:message profile mapping and incoming payload types`
- Test: `convex/whatsappWebhookReceive.test.ts`

**Interfaces:**

- Produces optional `customers.whatsappUserId: string` and `customers.whatsappUsername: string`.
- Produces optional `IngestChannelMessageArgs.whatsappUserId` and `IngestChannelMessageArgs.whatsappUsername`.
- `internal.customers.internalUpsertFromWebhook` accepts and persists those same optional properties only for WhatsApp contacts.

- [ ] **Step 1: Write the failing username-only webhook regression**

Create a fixture matching the supplied event and assert the mutation invocation has the provider identity rather than a phone identity:

```ts
expect(runMutation).toHaveBeenCalledWith(
  expect.anything(),
  expect.objectContaining({
    from: "US.13491208655302741918",
    profileName: "test user name",
    whatsappUserId: "US.13491208655302741918",
    whatsappUsername: "@testusername",
  }),
);
```

Also retain the existing phone fixture and assert its invocation still contains `from: "60123456789"` without username identity fields. The production change this test must catch is accidentally joining `contacts[].user_id` with `message.from`, or treating `from_user_id` as a phone number.

- [ ] **Step 2: Run the webhook test to verify it fails**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/whatsappWebhookReceive.test.ts
```

Expected: FAIL because the parser does not yet recognize `from_user_id`, `contacts[].user_id`, or `profile.username`.

- [ ] **Step 3: Add the typed data model and propagation**

Add the two optional schema fields. Extend the webhook payload types with `contacts[].user_id`, `contacts[].profile.username`, and `messages[].from_user_id`. Resolve the inbound identifier as `message.from_user_id ?? message.from`; use a profile map keyed by both `wa_id` and `user_id`; and pass the username fields to the ingestion mutation.

Extend the typed ingestion/upsert arguments with the optional fields. When the contact has a WhatsApp user ID, insert/patch it and its username, leave `phone` undefined, and use a fallback display name based on `@username` or the raw contact address without adding a `+` prefix.

- [ ] **Step 4: Run the webhook test to verify it passes**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/whatsappWebhookReceive.test.ts
```

Expected: PASS, with the original success/retry/error cases still green.

- [ ] **Step 5: Commit the persistence boundary**

```bash
git add convex/schema.ts convex/customers.ts convex/chat/threads.ts convex/whatsappWebhook.ts convex/whatsappWebhookReceive.test.ts
git commit -m "feat: persist WhatsApp username contacts"
```

### Task 2: Build the shared WhatsApp recipient contract

**Files:**

- Create: `convex/whatsappRecipient.ts`
- Test: `convex/whatsappRecipient.test.ts`

**Interfaces:**

- Produces `buildWhatsAppRecipient(customer)` returning either `{ recipient: string }` or `{ to: string }`.
- Consumes `Pick<Doc<"customers">, "contactAddress" | "phone" | "whatsappUserId">`.
- Throws `Customer has no WhatsApp recipient` when neither identity is usable.

- [ ] **Step 1: Write failing recipient-builder tests**

Use literal customer-shaped fixtures and assert exact, mutually exclusive results:

```ts
expect(buildWhatsAppRecipient({
  contactAddress: "US.13491208655302741918",
  whatsappUserId: "US.13491208655302741918",
})).toEqual({ recipient: "US.13491208655302741918" });

expect(buildWhatsAppRecipient({
  contactAddress: "+1 (650) 555-1111",
})).toEqual({ to: "16505551111" });
```

Assert each result does not contain the other key. The production changes this catches are using `to` for a provider ID or passing a phone number without normalization.

- [ ] **Step 2: Run the recipient-builder test to verify it fails**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/whatsappRecipient.test.ts
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the minimal recipient builder**

Create `buildWhatsAppRecipient` in `convex/whatsappRecipient.ts`. It trims and prefers `whatsappUserId`, otherwise chooses `phone` then `contactAddress`, passes that phone value through `ensureWhatsAppRecipientPhone`, and returns a discriminated payload object. It must not include empty keys.

- [ ] **Step 4: Run the recipient-builder test to verify it passes**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/whatsappRecipient.test.ts
```

Expected: PASS for username and legacy phone identities.

- [ ] **Step 5: Commit the shared contract**

```bash
git add convex/whatsappRecipient.ts convex/whatsappRecipient.test.ts
git commit -m "feat: add WhatsApp recipient routing"
```

### Task 3: Route inbox and workflow sends through the recipient contract

**Files:**

- Modify: `convex/chat/inbox.ts:internalGetSendContext`
- Modify: `convex/chat/inboxActions.ts:human and AI send call sites`
- Modify: `convex/chat/channelSend.ts:WhatsApp text, media, and reaction payloads`
- Modify: `convex/workflowWhatsappTemplateSender.ts:sendWorkflowWhatsappTemplate`
- Modify: `convex/whatsappSend.ts:sendText context and payload`
- Test: `convex/chat/channelSend.test.ts`
- Test: `convex/workflowWhatsappTemplateSender.test.ts`

**Interfaces:**

- `internalGetSendContext` returns `{ conversation, channel, customer }` only when a valid linked customer exists.
- `sendTextToChannel`, `sendMediaToChannel`, and WhatsApp reaction helpers receive the associated customer wherever `conversation.service === "whatsapp"`.
- All Meta WhatsApp bodies spread `buildWhatsAppRecipient(customer)` before `type`.

- [ ] **Step 1: Write failing inbox send tests**

Add a username-only customer fixture to `convex/chat/channelSend.test.ts`, call the real text and media send functions with it, and inspect the intercepted request body:

```ts
expect(body).toMatchObject({
  messaging_product: "whatsapp",
  recipient: "US.13491208655302741918",
});
expect(body).not.toHaveProperty("to");
```

Keep the existing phone assertions and add `expect(body).not.toHaveProperty("recipient")`. The production change this catches is sending any inbox text, attachment, or reaction to a username customer using `to`.

Add a workflow template test that captures `fetch` and asserts the same username payload. It must call `sendWorkflowWhatsappTemplate`, not inspect source text.

- [ ] **Step 2: Run the inbox/workflow tests to verify they fail**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/chat/channelSend.test.ts convex/workflowWhatsappTemplateSender.test.ts
```

Expected: FAIL because current bodies contain `to: conversation.contactAddress` or normalize the user ID as a phone.

- [ ] **Step 3: Thread the customer through every inbox outbound path**

Make `internalGetSendContext` load `conversation.customerId` and return null when it is unavailable for a channel send. Pass the returned customer from human replies, internal text sends, AI reply sends, and reaction actions into channel send functions. Change the WhatsApp-only implementations to build their address fields through `buildWhatsAppRecipient(customer)` while leaving Instagram, Messenger, web, and avatar signatures/behavior intact.

Update the direct `whatsappSend` context query to include the associated customer and use the same builder for its freeform payload.

- [ ] **Step 4: Route workflow templates through the builder**

Replace the direct `rawRecipient` / `ensureWhatsAppRecipientPhone` logic in `sendWorkflowWhatsappTemplate` with `buildWhatsAppRecipient(args.customer)`, then spread its output into the template body. This covers classic follow-up workers plus workflow follow-up and reminder workers because they share this sender.

- [ ] **Step 5: Run the inbox/workflow tests to verify they pass**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/chat/channelSend.test.ts convex/workflowWhatsappTemplateSender.test.ts
```

Expected: PASS with phone payloads unchanged and username payloads using only `recipient`.

- [ ] **Step 6: Commit the shared send paths**

```bash
git add convex/chat/inbox.ts convex/chat/inboxActions.ts convex/chat/channelSend.ts convex/whatsappSend.ts convex/workflowWhatsappTemplateSender.ts convex/chat/channelSend.test.ts convex/workflowWhatsappTemplateSender.test.ts
git commit -m "feat: route inbox and workflow username recipients"
```

### Task 4: Route broadcasts and present opted-in usernames

**Files:**

- Modify: `convex/broadcastPool.ts:broadcastWorker`
- Modify: `convex/whatsappBroadcast.ts:sendTemplateBatchToPhones`
- Modify: `convex/customers.ts:listForAgentBroadcast, listWhatsAppBroadcastCandidates, getSidebarDetailsForConversation`
- Modify: `src/pages/AutomationsBroadcastPage.tsx` and `src/components/broadcast/BroadcastRecipientsTable.tsx`
- Test: `convex/broadcastPool.test.ts`
- Test: `convex/customers.test.ts`

**Interfaces:**

- Scheduled broadcast workers call `buildWhatsAppRecipient(customer)`.
- Broadcast candidate/list rows expose `recipientLabel`, set to `whatsappUsername` when supplied, otherwise the existing phone presentation.
- UI displays `recipientLabel` and continues selecting by `customerId`.

- [ ] **Step 1: Write failing scheduled-broadcast tests**

Create a broadcast worker context with a customer whose `contactAddress` and `whatsappUserId` are `US.13491208655302741918` and whose `whatsappUsername` is `@testusername`. Stub only `fetch`, run the worker, and assert its request payload contains:

```ts
expect(requestBody).toMatchObject({
  messaging_product: "whatsapp",
  recipient: "US.13491208655302741918",
  type: "template",
});
expect(requestBody).not.toHaveProperty("to");
```

Add a customer-list test asserting the candidate’s label is `@testusername`, while a legacy fixture still produces its phone number. The production changes this catches are skipping username customers in broadcasts or leaking their provider ID as a phone label.

- [ ] **Step 2: Run broadcast/customer tests to verify they fail**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/broadcastPool.test.ts convex/customers.test.ts
```

Expected: FAIL because broadcasts normalize `contactAddress` as a phone and no recipient label is returned.

- [ ] **Step 3: Implement broadcast routing and presentation**

Replace broadcast worker phone normalization with `buildWhatsAppRecipient(customer)`. Keep the ad-hoc `sendTemplateBatch` API explicitly phone-only because it accepts raw `toPhones`, and reject values that are not valid phones rather than accepting provider IDs.

Update customer/broadcast candidate projections to include an explicit `recipientLabel`; use `whatsappUsername` first, then existing phone display. Update the two broadcast UI consumers to search, key, and render that label without changing customer-ID selection.

- [ ] **Step 4: Run broadcast/customer tests to verify they pass**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/broadcastPool.test.ts convex/customers.test.ts
```

Expected: PASS for username recipients and legacy phone customers.

- [ ] **Step 5: Commit broadcast support**

```bash
git add convex/broadcastPool.ts convex/whatsappBroadcast.ts convex/customers.ts src/pages/AutomationsBroadcastPage.tsx src/components/broadcast/BroadcastRecipientsTable.tsx convex/broadcastPool.test.ts convex/customers.test.ts
git commit -m "feat: support username recipients in broadcasts"
```

### Task 6: Verify the complete change and prepare review

**Files:**

- Modify: `CONTINUITY.md`
- Test: all focused files from Tasks 1–4

**Interfaces:**

- Confirms the schema, inbound upsert, recipient builder, inbox, workflow, and broadcast behaviors work together.

- [ ] **Step 1: Run focused regression coverage**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/whatsappWebhookReceive.test.ts convex/whatsappRecipient.test.ts convex/chat/channelSend.test.ts convex/workflowWhatsappTemplateSender.test.ts convex/broadcastPool.test.ts convex/customers.test.ts
```

Expected: PASS with no failures.

- [ ] **Step 2: Run static and diff validation**

Run the project’s targeted TypeScript/lint commands for modified Convex and React files, then:

```bash
git diff --check
```

Expected: no errors and no whitespace defects. Record any unrelated baseline failures separately rather than suppressing them.

- [ ] **Step 3: Update continuity and commit the verified feature**

Record the focused verification results and PR state in `CONTINUITY.md`. Do not update the customer-facing changelog because the feature is not yet confirmed released.

```bash
git add CONTINUITY.md
git commit -m "docs: record WhatsApp username recipient verification"
```

- [ ] **Step 4: Push the feature branch and open a PR against `main`**

```bash
git push -u origin codex/whatsapp-username-recipients
gh pr create --base main --head codex/whatsapp-username-recipients --title "Support WhatsApp username recipients" --fill
```

Expected: a PR URL ready for review.

### Task 7: Preserve identity across Meta BSUID-change system events

**Files:**

- Modify: `convex/schema.ts:customers indexes`
- Modify: `convex/customers.ts:internalApplyWhatsAppUserIdChange`
- Modify: `convex/whatsappWebhook.ts:system payload parsing and dispatch`
- Modify: `convex/whatsappWebhookReceive.test.ts:system-event boundary`
- Create: `convex/whatsappUserIdChange.test.ts`

**Interfaces:**

- Produces `internal.customers.internalApplyWhatsAppUserIdChange({ phoneNumberId, previousUserId, userId, phone })` returning `{ updated: boolean }`.
- Consumes `system.wa_id`, `system.user_id`, `system.previous_user_id`, parent IDs, and `system.type` from `WhatsAppIncomingMessage`.
- Produces the `customers` index `by_orgId_and_service_and_whatsappUserId`.

- [ ] **Step 1: Write the failing database continuity regression**

Create `convex/whatsappUserIdChange.test.ts` with a real Convex test database. Insert a WhatsApp channel, a customer whose `contactAddress` and `whatsappUserId` equal `US.old`, and a linked WhatsApp conversation. Invoke the desired internal mutation:

```ts
const result = await t.mutation(
  internal.customers.internalApplyWhatsAppUserIdChange,
  {
    phoneNumberId: "phone-123",
    previousUserId: "US.old",
    userId: "US.new",
    phone: "16505551111",
  },
);

expect(result).toEqual({ updated: true });
expect(customer).toMatchObject({
  contactAddress: "US.new",
  whatsappUserId: "US.new",
  whatsappUsername: "@testusername",
  phone: "16505551111",
});
expect(conversation).toMatchObject({ contactAddress: "US.new", customerId });
```

Add a separate unknown-prior-ID case asserting `{ updated: false }` and no document changes. This catches creating a second customer/conversation, losing the username, and cross-channel updates.

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/whatsappUserIdChange.test.ts
```

Expected: FAIL because `internalApplyWhatsAppUserIdChange` does not exist.

- [ ] **Step 3: Write the minimal customer continuity mutation**

Add the index and implement `internalApplyWhatsAppUserIdChange`. For WhatsApp channels with the supplied phone number ID, resolve the old user ID using the new index and then the existing `(orgId, service, contactAddress)` index. When one customer is found and the IDs differ, patch the current user ID/contact address and supplied phone only, preserving username. Patch linked WhatsApp conversations through `by_customerId`; return `{ updated: true }`. Unknown, malformed, or no-op input returns `{ updated: false }` without writes.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/whatsappUserIdChange.test.ts
```

Expected: PASS for transfer and no-op cases.

- [ ] **Step 5: Write the failing webhook system-event regression**

Add `user_changed_user_id` and `user_changed_number` fixtures to `convex/whatsappWebhookReceive.test.ts`. Both omit top-level `from`; the number-change fixture includes `wa_id` and parent IDs. Assert each dispatches the continuity mutation with literal `phoneNumberId`, `previousUserId`, `userId`, and optional phone, and assert neither dispatches the normal incoming-message mutation.

```ts
expect(systemChangeArgs).toMatchObject({
  phoneNumberId: "phone-123",
  previousUserId: "US.old",
  userId: "US.new",
  phone: "16505551111",
});
expect(inboundArgs).toBeUndefined();
```

This catches requiring `from`, ingesting a system event as chat, or dropping the number-change variant.

- [ ] **Step 6: Run test to verify it fails**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/whatsappWebhookReceive.test.ts
```

Expected: FAIL because the parser does not recognize and dispatch the nested system payload.

- [ ] **Step 7: Parse and dispatch only supported system events**

Extend `WhatsAppIncomingMessage` with a typed optional `system` object. Before resolving ordinary inbound `from`, dispatch only the two supported types when their nested IDs are non-empty and differ. Use `system.wa_id ?? message.from` as the optional phone, then continue without ingesting the record. Preserve existing ordinary-message handling.

- [ ] **Step 8: Run both system-event tests to verify they pass**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/whatsappUserIdChange.test.ts convex/whatsappWebhookReceive.test.ts
```

Expected: PASS, including no-inbox-message assertions.

- [ ] **Step 9: Commit the system-event continuity feature**

```bash
git add convex/schema.ts convex/customers.ts convex/whatsappWebhook.ts convex/whatsappWebhookReceive.test.ts convex/whatsappUserIdChange.test.ts docs/superpowers/plans/2026-08-31-whatsapp-username-recipients.md
git commit -m "feat: preserve WhatsApp user ID changes"
```
