# WhatsApp Webhook Billing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist Meta's outbound WhatsApp pricing receipt and show a free or billed-service label with explanatory context beside each outgoing Inbox timestamp.

**Architecture:** Extend the existing `messages.receiptMetadata` receipt record with optional structured Meta pricing data, written atomically by the established status-receipt path. The Inbox mapper carries this snapshot and channel service to a focused pricing-label component; the component owns presentation and the accessible payment-context tooltip.

**Tech Stack:** Convex schema, internal mutations, Vitest/convex-test, React, Radix Tooltip, Lucide icons.

**Spec:** `docs/superpowers/specs/2026-09-27-whatsapp-webhook-billing-design.md`

## Global Constraints

- Use Node.js 22 for every command: `source ~/.nvm/nvm.sh && nvm use 22`.
- Meta's `pricing.billable` is the only billing authority; do not create a monthly counter or infer billability.
- Use required `WHATSAPP_SERVICE_MESSAGE_PRICE_MYR` only to snapshot a billable service-message display price; never provide a default rate.
- Store the display rate as an exact decimal string, not a floating-point value.
- Existing outgoing WhatsApp messages without pricing metadata display as Free; non-WhatsApp messages have no pricing label.
- Keep production code self-explanatory, without comments, and split code so no code file exceeds 300 LOC.
- Do not alter the pre-existing `convex/_generated/api.d.ts` change or `.worktrees/` directory.
- This is unshipped customer-facing work; keep `CONTINUITY.md` current and do not add a release-changelog entry until production availability is confirmed.

## Review Focus

- A duplicate or later read receipt without a pricing object must preserve the initially recorded Meta pricing snapshot. Covered in Task 1.
- A paid service receipt must never become a Free label because the environment value changed after the webhook. Covered in Task 1 and Task 3.
- A non-WhatsApp outbound message without pricing must not receive the legacy Free label. Covered in Task 3.
- A malformed pricing object must not prevent an ordinary status receipt from being applied. Covered in Task 2.
- The info control must be keyboard reachable and communicate the full payment context, not only visually on hover. Covered in Task 3.

### Task 1: Persist provider pricing with delivery receipts

**Files:**
- Create: `convex/whatsappPricing.ts`
- Create: `convex/whatsappPricing.test.ts`
- Modify: `convex/schema.ts:1443-1458`
- Modify: `convex/chat/readReceipts.ts:9-105`
- Modify: `convex/readReceipts.test.ts:1-120`

**Interfaces:**
- Consumes: a complete Meta pricing object `{ billable, pricingModel, type, category }` and an optional receipt timestamp.
- Produces: `WhatsAppPricingSnapshot` with the original Meta values, `recordedAt`, and `servicePriceMyr` only for billable service pricing.
- Produces: `applyOutboundStatusByExternalId(..., { pricing?: WhatsAppPricingSnapshot })`, which stores pricing under `messages.receiptMetadata.pricing` while preserving any existing pricing snapshot when the incoming receipt has none.

- [ ] **Step 1: Write failing pricing-contract tests**

Create `convex/whatsappPricing.test.ts` for a free service webhook object and a billable service object while `WHATSAPP_SERVICE_MESSAGE_PRICE_MYR="0.00321"`; assert the latter snapshots exactly `"0.00321"`. Add assertions that a missing or non-decimal price throws for billed service and that non-service Meta categories do not receive a service price.

- [ ] **Step 2: Run the pricing-contract test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/whatsappPricing.test.ts`

Expected: FAIL because the pricing snapshot module does not exist.

- [ ] **Step 3: Implement the pricing snapshot contract and schema**

Add a focused `convex/whatsappPricing.ts` module exporting `MetaWhatsAppPricing` and `createWhatsAppPricingSnapshot(pricing: MetaWhatsAppPricing, recordedAt: number): WhatsAppPricingSnapshot`. Validate the required environment value only for `billable && category === "service"`. Add the matching optional `receiptMetadata.pricing` Convex validator to `messages` in `convex/schema.ts`.

- [ ] **Step 4: Run the pricing-contract test to verify it passes**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/whatsappPricing.test.ts`

Expected: PASS.

- [ ] **Step 5: Write failing receipt-persistence tests**

In `convex/readReceipts.test.ts`, add a WhatsApp receipt with free pricing and assert `messages.receiptMetadata.pricing` stores all Meta fields. Add a billed-service receipt followed by a read receipt without pricing and assert the exact snapshotted MYR rate remains present.

- [ ] **Step 6: Run the receipt-persistence test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/readReceipts.test.ts`

Expected: FAIL because the status updater cannot accept or preserve pricing data.

- [ ] **Step 7: Extend the shared receipt updater**

Extend `ReceiptUpdateOptions` and `applyOutboundStatusByExternalId` in `convex/chat/readReceipts.ts` with optional `pricing`. Merge the new snapshot into `receiptMetadata.pricing` without erasing it on later pricing-less status updates; retain current status rank, failure, read, channel-filter, and multi-row behavior.

- [ ] **Step 8: Run receipt tests to verify they pass**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/readReceipts.test.ts convex/whatsappPricing.test.ts`

Expected: PASS.

- [ ] **Step 9: Commit the receipt data-model work**

```bash
git add convex/schema.ts convex/chat/readReceipts.ts convex/readReceipts.test.ts convex/whatsappPricing.ts convex/whatsappPricing.test.ts
git commit -m "feat: record WhatsApp webhook pricing"
```

### Task 2: Forward Meta pricing from the WhatsApp webhook

**Files:**
- Modify: `convex/whatsappWebhook.ts:618-627,1231-1285,1559-1570`
- Modify: `convex/whatsappWebhookReceive.test.ts`

**Interfaces:**
- Consumes: Meta `statuses[].pricing` payload fields in the incoming WhatsApp webhook.
- Produces: `handleStatus` calls with `pricing?: MetaWhatsAppPricing`; pricing-less and malformed provider payloads remain normal status updates.

- [ ] **Step 1: Write a failing webhook forwarding test**

In `convex/whatsappWebhookReceive.test.ts`, construct a status-only webhook payload containing the supplied `PMP` service pricing data. Assert the captured `internal.whatsappWebhook.handleStatus` invocation includes `pricing: { billable, pricingModel, type, category }`. Add an incomplete pricing payload case that still invokes status handling without a `pricing` field.

- [ ] **Step 2: Run the webhook forwarding test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/whatsappWebhookReceive.test.ts`

Expected: FAIL because receipt pricing is discarded by the webhook parser.

- [ ] **Step 3: Parse and forward complete provider pricing**

Add the optional `pricing` shape to `WhatsAppValue.statuses`, validate it in `handleStatus`, and forward only a complete object with Meta's `pricing_model` renamed to the internal `pricingModel`. Convert it to `createWhatsAppPricingSnapshot` at status handling so the receipt updater receives only trusted, stored pricing data.

- [ ] **Step 4: Run the webhook and receipt tests to verify they pass**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/whatsappWebhookReceive.test.ts convex/readReceipts.test.ts convex/whatsappPricing.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit webhook parsing**

```bash
git add convex/whatsappWebhook.ts convex/whatsappWebhookReceive.test.ts
git commit -m "feat: capture WhatsApp receipt pricing"
```

### Task 3: Render pricing labels and the accessible explanation

**Files:**
- Create: `src/components/inbox/WhatsAppPricingLabel.tsx`
- Create: `src/components/inbox/WhatsAppPricingLabel.test.tsx`
- Modify: `convex/chat/inboxMessageMapping.ts:75-95,292-320`
- Modify: `src/lib/inboxOptimistic.ts:14-28`
- Modify: `src/components/inbox/InboxThreadMessages.tsx:1-55,775-782`

**Interfaces:**
- Consumes: `{ service, direction, pricing }` from the persisted message ledger.
- Produces: `WhatsAppPricingLabel`, returning nothing for non-WhatsApp/non-outgoing messages; otherwise Free or `Service (RM<snapshot>)` plus an accessible information tooltip.

- [ ] **Step 1: Write failing label-presentation tests**

Create `src/components/inbox/WhatsAppPricingLabel.test.tsx` using `renderToStaticMarkup` and `TooltipProvider`. Assert legacy WhatsApp without pricing renders `Free`, a billable-service snapshot renders `Service (RM0.00321)`, and Instagram without pricing renders no label. Assert the rendered information control has an accessible label and contains the exact 1 October / 1,000-message / Meta Business Manager copy.

- [ ] **Step 2: Run the label-presentation test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/inbox/WhatsAppPricingLabel.test.tsx`

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the focused pricing-label component**

Create `WhatsAppPricingLabel` with the shared Tooltip primitives and an `Info` icon. It must use the persisted decimal snapshot rather than environment data and render the exact tooltip copy: “Starting 1 October, Meta includes 1,000 free WhatsApp service messages each month. After that, service messages are charged. Add a payment method in Meta Business Manager to keep sending WhatsApp messages with Kilobot.”

- [ ] **Step 4: Run the label-presentation test to verify it passes**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/inbox/WhatsAppPricingLabel.test.tsx`

Expected: PASS.

- [ ] **Step 5: Write failing Inbox data-flow tests**

Extend `WhatsAppPricingLabel.test.tsx` with the `InboxUIMessage` contract expected from `messageDocsToInboxUIMessages`: ledger `service` and `receiptMetadata.pricing` must reach the label without reading the environment. Add a source-level integration assertion that `InboxThreadMessages` renders `<WhatsAppPricingLabel` in the outgoing timestamp row.

- [ ] **Step 6: Run the Inbox data-flow test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/inbox/WhatsAppPricingLabel.test.tsx`

Expected: FAIL because the Inbox message types and mapper omit service and receipt pricing.

- [ ] **Step 7: Carry ledger fields into the Inbox and mount the label**

Add `service` and optional `receiptPricing` to both Inbox UI message type declarations. Populate those fields from the matching ledger row in `messageDocsToInboxUIMessages`, then render `WhatsAppPricingLabel` after the outgoing timestamp in `InboxThreadMessages`. Leave receipt icons and labels for inbound, non-WhatsApp, and optimistic messages unchanged.

- [ ] **Step 8: Run the focused UI suite to verify it passes**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/inbox/WhatsAppPricingLabel.test.tsx src/components/inbox/InboxBroadcastMessage.test.ts`

Expected: PASS.

- [ ] **Step 9: Commit Inbox presentation**

```bash
git add convex/chat/inboxMessageMapping.ts src/lib/inboxOptimistic.ts src/components/inbox/InboxThreadMessages.tsx src/components/inbox/WhatsAppPricingLabel.tsx src/components/inbox/WhatsAppPricingLabel.test.tsx
git commit -m "feat: show WhatsApp message pricing"
```

### Task 4: Verify the complete feature and record the deployment prerequisite

**Files:**
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: completed receipt, webhook, and Inbox work from Tasks 1-3.
- Produces: verified implementation plus a ledger entry that the actual production rate is awaiting configuration, unless it has been supplied and set.

- [ ] **Step 1: Run static and focused integration verification**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx tsc --noEmit && bunx vitest run convex/whatsappPricing.test.ts convex/readReceipts.test.ts convex/whatsappWebhookReceive.test.ts src/components/inbox/WhatsAppPricingLabel.test.tsx src/components/inbox/InboxBroadcastMessage.test.ts && git diff --check`

Expected: all listed checks PASS with no whitespace errors.

- [ ] **Step 2: Run the project suite**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bun test`

Expected: PASS; report any existing unrelated failures by test name.

- [ ] **Step 3: Configure deployment only after receiving the exact MYR rate**

Set `WHATSAPP_SERVICE_MESSAGE_PRICE_MYR` in the target Convex environment to the user-provided canonical decimal value. Do not deploy or set a guessed rate.

- [ ] **Step 4: Update continuity and commit final bookkeeping**

Record test outcomes and whether the production environment rate is configured in `CONTINUITY.md`. Add a changelog entry only after confirmed production availability.

```bash
git add CONTINUITY.md
git commit -m "docs: record WhatsApp pricing verification"
```
