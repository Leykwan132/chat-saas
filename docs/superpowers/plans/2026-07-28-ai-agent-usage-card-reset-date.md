# AI Agent Usage Card Reset Date Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the actual credit reset date concisely in the AI Agent Usage card and slightly reduce the exact credit-balance typography.

**Architecture:** Keep `PlanUsageCard` connected to the existing `getPlanAndUsage` query and render its existing `periodEndMs` value in the card description. Protect the presentation with a focused source contract so billing analytics and backend behavior remain untouched.

**Tech Stack:** React, TypeScript, Convex React, Tailwind CSS, Vitest

## Global Constraints

- Use Node.js v22 for every test or script.
- Keep exact locale-formatted credit values.
- Use `periodEndMs`, not the Stripe billing-period end.
- Do not change analytics range behavior or credit-reset scheduling.
- Keep code files below 300 lines and do not add code comments.

---

### Task 1: Refine the AI Agent Usage card

**Files:**
- Create: `src/components/analytics/PlanUsageCard.test.ts`
- Modify: `src/components/analytics/PlanUsageCard.tsx`
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: `planAndUsage.periodEndMs: number | null`
- Produces: Card description `Resets ${new Date(periodEndMs).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` when the reset timestamp exists

- [ ] **Step 1: Write the failing source contract**

```ts
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const source = readFileSync(new URL('./PlanUsageCard.tsx', import.meta.url), 'utf8');

test('shows the credit reset date instead of redundant plan status', () => {
  expect(source).toContain('planAndUsage?.periodEndMs');
  expect(source).toContain('Credits reset on');
  expect(source).not.toContain('You are on ${planName} plan');
});

test('keeps exact balances with a slightly smaller hierarchy', () => {
  expect(source).toContain('text-xl font-semibold tracking-tight');
  expect(source).toContain('text-xs text-muted-foreground');
  expect(source).toContain('{remaining.toLocaleString()}');
  expect(source).toContain('{total.toLocaleString()} credits');
  expect(source).not.toContain('text-2xl font-semibold tracking-tight');
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/analytics/PlanUsageCard.test.ts
```

Expected: FAIL because the card still renders the plan-status sentence and `text-2xl`.

- [ ] **Step 3: Implement the reset description and compact typography**

In `PlanUsageCard.tsx`, derive `periodEndMs`, format it with `month: 'short'` and `day: 'numeric'`, replace the loaded description with the concise reset copy, change the remaining balance class to `text-xl`, and give the inline suffix `text-xs text-muted-foreground`.

- [ ] **Step 4: Run focused verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/analytics/PlanUsageCard.test.ts
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/components/analytics/PlanUsageCard.tsx src/components/analytics/PlanUsageCard.test.ts
git diff --check
```

Expected: the focused tests, scoped lint, and whitespace validation pass.

- [ ] **Step 5: Record the unreleased customer-facing result**

Update `CONTINUITY.md` with the implemented presentation, verification receipt, and working-set paths. Do not update the public changelog until the production release date is confirmed.
