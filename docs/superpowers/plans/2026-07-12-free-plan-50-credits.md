# Free Plan 50 Credits Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce the Free plan's recurring allowance from 100 credits to 50 credits and keep customer-facing pricing copy consistent.

**Architecture:** Keep `PLAN_CATALOG.free.monthlyCredits` as the single enforcement source consumed by the existing credit-period grant flow. Update the two hard-coded Free plan descriptions and protect the entitlement and plan feature with focused catalog assertions.

**Tech Stack:** TypeScript, Vitest, Convex shared plan catalog, React content modules

## Global Constraints

- Node.js 22 is required for every script and test command.
- Existing in-cycle Free balances must not be rewritten.
- Starter, Growth, Business, purchased credits, and per-message credit costs remain unchanged.
- No new message-count limit or dependency is introduced.
- Code files must remain below 300 lines and should not gain comments.

---

### Task 1: Change and verify the Free monthly allowance

**Files:**
- Modify: `convex/llm/modelPricing.test.ts`
- Modify: `shared/planCatalog.ts`
- Modify: `src/content/pricingFaqs.ts`
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: `PLAN_CATALOG.free.monthlyCredits: number` and `PLAN_CATALOG.free.displayFeatures: string[]`.
- Produces: a 50-credit Free entitlement used unchanged by `convex/creditPeriodPool.ts` when opening future credit periods.

- [ ] **Step 1: Write the failing catalog assertions**

Add this focused test to `convex/llm/modelPricing.test.ts`:

```ts
test("Free plan grants and advertises 50 monthly credits", () => {
  expect(PLAN_CATALOG.free.monthlyCredits).toBe(50);
  expect(PLAN_CATALOG.free.displayFeatures).toContain("50 credits / mo");
  expect(PLAN_CATALOG.free.displayFeatures).not.toContain("100 credits / mo");
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/llm/modelPricing.test.ts
```

Expected: FAIL because the catalog still grants and advertises 100 credits.

- [ ] **Step 3: Implement the catalog and copy change**

In `shared/planCatalog.ts`, set the Free plan fields to:

```ts
monthlyCredits: 50,
```

```ts
"50 credits / mo",
```

In `src/content/pricingFaqs.ts`, change the Free FAQ sentence to:

```ts
'Yes. You can start with the Free plan, which includes 50 credits per month and core AI agent features. Paid plans unlock higher limits and more advanced features.',
```

- [ ] **Step 4: Verify GREEN and stale-copy absence**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/llm/modelPricing.test.ts
```

Expected: all tests pass.

Run:

```bash
rg -n "100 credits" shared src convex --glob '!**/*.test.*'
```

Expected: no active source matches.

Run:

```bash
git diff --check
```

Expected: no output.

- [ ] **Step 5: Record verification and publish**

Update `CONTINUITY.md` with the completed state and verification receipt, stage only the plan, catalog, FAQ, test, and ledger, then commit and push the current branch.
