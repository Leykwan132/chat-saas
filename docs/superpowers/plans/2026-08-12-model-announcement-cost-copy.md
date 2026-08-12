# Model Announcement Cost Copy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the expanded model-support announcement list introduced models, their credit costs, removed models, and the new 0.5-credit tier.

**Architecture:** Keep the existing structured `Announcement.details: string[]` interface and Accordion presentation. Replace only the first announcement’s detail strings and its exact regression expectations.

**Tech Stack:** TypeScript, React 19, Vitest, Node.js 22, Bun.

## Global Constraints

- Use `credits/message` for customer-facing unit copy.
- Name GPT-OSS 120B and Qwen3.7 Flash as the new 0.5-credit tier.
- Name NVIDIA Nemotron 3.5 Lightning at one credit/message and GPT-5.6 Luna at two credits/message.
- State that DeepSeek V4 Flash remains available at one credit/message.
- State that Amazon Nova Micro and Google Gemini 3.1 Flash Lite are removed.
- Preserve the existing announcement UI, date, banner, icon, tag, and Accordion behavior.
- Preserve the unrelated untracked `pricing-knowledge-base-updated.md` file.
- Do not update the production changelog while availability remains unconfirmed.

---

### Task 1: Replace the expanded announcement details

**Files:**
- Modify: `src/components/WhatsNewDialog.test.tsx`
- Modify: `src/components/whats-new/announcements.ts`
- Modify: `CONTINUITY.md`

**Interfaces:**
- Preserves: `Announcement.details: string[]`.
- Produces: five exact customer-facing detail strings covering tier, additions, retained DeepSeek, and removals.

- [x] **Step 1: Write the failing exact-copy regression**

Expect these detail strings:

```ts
[
  'New 0.5-credit tier: GPT-OSS 120B and Qwen3.7 Flash — 0.5 credits/message.',
  'New: NVIDIA Nemotron 3.5 Lightning — 1 credit/message.',
  'New: GPT-5.6 Luna — 2 credits/message.',
  'Also available: DeepSeek V4 Flash — 1 credit/message.',
  'Removed: Amazon Nova Micro and Google Gemini 3.1 Flash Lite.',
]
```

- [x] **Step 2: Run the focused test and verify RED**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/WhatsNewDialog.test.tsx
```

Expected: FAIL because the current details describe use cases instead of catalog changes and costs.

- [x] **Step 3: Replace the announcement detail data**

Set `ANNOUNCEMENTS[0].details` to the exact five strings from Step 1. Do not change the component or announcement type.

- [x] **Step 4: Run focused verification**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/WhatsNewDialog.test.tsx src/components/SupportHoverCard.test.ts && bunx eslint src/components/WhatsNewDialog.test.tsx src/components/whats-new/announcements.ts && bun run build && git diff --check
```

- [x] **Step 5: Update continuity and commit**

Record the exact copy outcome and verification receipt, then stage only the plan, test, announcement data, and continuity ledger:

```bash
git add CONTINUITY.md docs/superpowers/plans/2026-08-12-model-announcement-cost-copy.md src/components/WhatsNewDialog.test.tsx src/components/whats-new/announcements.ts
git commit -m "Clarify model update announcement"
```
