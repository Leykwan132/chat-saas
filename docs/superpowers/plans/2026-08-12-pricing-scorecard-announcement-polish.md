# Pricing, Scorecard, and Announcement Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show canonical top-up prices in the Pricing FAQ, add model identity and StickerStar styling to scorecard HoverCards, and replace the two-stage What’s new flow with one modal containing expandable announcement details.

**Architecture:** Pricing FAQ copy is derived from the shared extra-credit catalog. `ModelPickerItem` passes existing model identity into `ModelScoreHoverCard`, which reuses `ModelSelectorLogo` and a single read-only StickerStar style. `WhatsNewDialog` becomes the only announcement modal and composes a focused `AnnouncementDialogList` with inline Accordion detail content.

**Tech Stack:** React 19, TypeScript, Vite, shadcn/ui, Radix Dialog/Accordion, `@smastrom/react-rating`, Vitest, Node.js 22, Bun.

## Global Constraints

- Keep source files below 300 lines and avoid code comments.
- Preserve model selection, keyboard navigation, and upgrade behavior.
- Keep ratings read-only and retain the visible `x.x / 5` score.
- Use `StickerStar` with active fill `#f59e0b` and inactive fill `#ffedd5`.
- Reuse `ModelSelectorLogo` for the 16px model identity icon.
- Derive top-up packages and policy from `shared/extraCreditsCatalog.ts`.
- Replace the announcement Popover and secondary detail Dialog with one click-open Dialog and inline Accordion details.
- Preserve the unrelated `pricing-knowledge-base-updated.md` working-tree file.
- Do not update the production changelog until availability is confirmed.

---

### Task 1: Add canonical top-up pricing to the existing FAQ

**Files:**
- Modify: `src/content/pricingFaqs.test.ts`
- Modify: `src/content/pricingFaqs.ts`

**Interfaces:**
- Consumes: `EXTRA_CREDITS_PACKS`, `EXTRA_CREDITS_PACK_NOTE`, and `formatExtraCreditsPackPrice(pack)` from `shared/extraCreditsCatalog.ts`.
- Produces: the existing `pricingFaqs` entry for `What happens if I use up my credits?` with all canonical package prices and policy text.

- [ ] **Step 1: Write the failing customer-visible FAQ regression**

Change the existing credit-limit test to assert the literal customer answer contains `2,000 credits for RM 49`, `5,000 credits for RM 99`, `15,000 credits for RM 249`, the carry-forward/non-expiry note, and the existing top-up/cycle/upgrade choices.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/content/pricingFaqs.test.ts
```

Expected: FAIL because the existing answer does not include package prices or the carry-forward policy.

- [ ] **Step 3: Build the answer from the shared catalog**

Import the three shared catalog exports and build the package sentence with:

```ts
const topUpPackageSummary = EXTRA_CREDITS_PACKS.map(
  (pack) => `${pack.credits.toLocaleString()} credits for ${formatExtraCreditsPackPrice(pack)}`,
).join(', ');
```

Use that summary and `EXTRA_CREDITS_PACK_NOTE` in the existing FAQ answer before the paused-usage explanation.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run the Step 2 command and expect all Pricing FAQ tests to pass.

### Task 2: Add model identity and StickerStar ratings

**Files:**
- Modify: `src/components/ModelScoreHoverCard.test.tsx`
- Modify: `src/components/ModelScoreHoverCard.tsx`
- Modify: `src/components/ModelPickerItem.tsx`

**Interfaces:**
- Consumes: `ModelPickerOption.label`, `chefSlug`, and optional `imageUrl`.
- Produces: `ModelScoreHoverCard({ modelId, modelLabel, chefSlug, imageUrl?, children })` with a shared model logo, visible name, and read-only StickerStar Rating.

- [ ] **Step 1: Write the failing identity and rating-style regression**

Pass `modelLabel: 'Qwen3.7 Flash'`, `chefSlug: 'qwen'`, and no image URL into the scorecard test. Assert rendered text contains the model label, descendants contain `ModelSelectorLogo` with provider `qwen` and class `size-4`, and the Rating props contain:

```ts
{
  value: 4,
  readOnly: true,
  itemStyles: {
    itemShapes: StickerStar,
    activeFillColor: '#f59e0b',
    inactiveFillColor: '#ffedd5',
  },
}
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/ModelScoreHoverCard.test.tsx src/components/modelPickerSelection.test.ts
```

Expected: FAIL because identity props, the identity row, and StickerStar styles do not exist.

- [ ] **Step 3: Add the identity props and shared logo row**

Extend `ModelScoreHoverCardProps` with `modelLabel`, `chefSlug`, and optional `imageUrl`. Render this before `Kilobot rating`:

```tsx
<div className="flex items-center gap-2">
  <ModelSelectorLogo provider={chefSlug} src={imageUrl} className="size-4" />
  <span className="font-semibold">{modelLabel}</span>
</div>
```

Update `ModelPickerItem` to pass `option.label`, `option.chefSlug`, and `option.imageUrl` into the wrapper. Preserve all row handlers and state.

- [ ] **Step 4: Apply the one read-only StickerStar style**

Import `StickerStar` and define:

```ts
const modelRatingItemStyles = {
  itemShapes: StickerStar,
  activeFillColor: '#f59e0b',
  inactiveFillColor: '#ffedd5',
};
```

Pass it through the existing Rating’s `itemStyles` prop without changing its value, read-only state, or 120px maximum width.

- [ ] **Step 5: Run the focused tests and verify GREEN**

Run the Step 2 command and expect all focused scorecard and selection tests to pass.

### Task 3: Replace What’s new with one announcement modal

**Files:**
- Modify: `src/components/WhatsNewDialog.test.tsx`
- Modify: `src/components/whats-new/announcements.ts`
- Create: `src/components/whats-new/AnnouncementDialogList.tsx`
- Modify: `src/components/WhatsNewDialog.tsx`
- Delete: `src/components/whats-new/AnnouncementPopoverList.tsx`
- Delete: `src/components/whats-new/AnnouncementDetailsDialog.tsx`

**Interfaces:**
- Produces: `Announcement` with `id`, `title`, `summary`, `details`, `isNew`, and `icon`; `actionLabel` is removed.
- Produces: `AnnouncementDialogList({ announcements })` with one-open Accordion and inline detail lists.
- Produces: `WhatsNewDialog` using one shadcn Dialog triggered by the existing Package button.

- [ ] **Step 1: Write the failing single-modal regression**

Update tests to assert `WhatsNewDialog` renders the Package button through a Dialog trigger, the announcement has no `actionLabel`, and `AnnouncementDialogList` contains `Accordion type="single" collapsible`, the `New` badge, and every detail string inline with no `View full update` text.

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/WhatsNewDialog.test.tsx src/components/SupportHoverCard.test.ts
```

Expected: FAIL because the implementation still uses a Popover, action button, and secondary detail Dialog.

- [ ] **Step 3: Create the modal Accordion list**

Move the existing header, ScrollArea, icons, titles, summaries, and badges into `AnnouncementDialogList`. Replace the action Button with:

```tsx
<AccordionContent className="px-6 pb-5">
  <ul className="flex list-disc flex-col gap-2 pl-8 text-sm text-muted-foreground">
    {announcement.details.map((detail) => <li key={detail}>{detail}</li>)}
  </ul>
</AccordionContent>
```

- [ ] **Step 4: Compose one accessible Dialog**

Replace Popover/state/detail selection in `WhatsNewDialog` with `Dialog`, `DialogTrigger asChild`, and one `DialogContent` containing a visible `DialogTitle`, an `sr-only` `DialogDescription`, and `AnnouncementDialogList`. Keep the Package button copy and header placement unchanged.

- [ ] **Step 5: Remove obsolete two-stage files and data**

Delete `AnnouncementPopoverList.tsx` and `AnnouncementDetailsDialog.tsx`. Remove `actionLabel` from the announcement type and data.

- [ ] **Step 6: Run the focused tests and verify GREEN**

Run the Step 2 command and expect all announcement/header tests to pass.

### Task 4: Verify and prepare local review

**Files:**
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces: a verified local commit on `codex/model-catalog-refresh`.

- [ ] **Step 1: Run the combined focused suite**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/content/pricingFaqs.test.ts src/components/ModelScoreHoverCard.test.tsx src/components/modelPickerSelection.test.ts src/components/WhatsNewDialog.test.tsx src/components/SupportHoverCard.test.ts
```

- [ ] **Step 2: Run scoped lint, production build, and whitespace validation**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/content/pricingFaqs.ts src/content/pricingFaqs.test.ts src/components/ModelScoreHoverCard.tsx src/components/ModelScoreHoverCard.test.tsx src/components/ModelPickerItem.tsx src/components/WhatsNewDialog.tsx src/components/WhatsNewDialog.test.tsx src/components/whats-new/announcements.ts src/components/whats-new/AnnouncementDialogList.tsx && bun run build && git diff --check
```

- [ ] **Step 3: Update continuity and request independent review**

Record exact test/build receipts, the three customer-facing outcomes, unchanged changelog state, release migration ordering, and preservation of `pricing-knowledge-base-updated.md`. Request review and resolve all Critical or Important findings.

- [ ] **Step 4: Commit the verified implementation**

Stage only the planned implementation/test/ledger files and commit:

```bash
git commit -m "Polish pricing and model updates"
```
