# Admin Cost Token Usage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add aggregate-backed historical and ongoing total-token reporting to Admin Costs, run and verify a one-time backfill, then remove all temporary migration code.

**Architecture:** A permanent `agentTokenUsage` TableAggregate mirrors the cost aggregate's namespace and time key while summing `usage.totalTokens`. The admin report joins cost and token sums over identical bounds; a temporary retry-safe cursor migration populates historical aggregate entries and is deleted after verification.

**Tech Stack:** Convex, `@convex-dev/aggregate`, TypeScript, React, Vitest, Bun with Node.js 22.

## Global Constraints

- All scripts and tests run after `nvm use 22` in the same shell.
- Code files stay below 300 lines and contain no comments unless unavoidable.
- Token totals use `rawAgentUsage.usage.totalTokens` with no fallback.
- The final codebase must not contain the temporary backfill or verification entrypoints.
- Existing cost, request, plan, and month behavior must remain unchanged.

---

### Task 1: Permanent token aggregate and report data flow

**Files:**
- Modify: `convex/adminUsageCosts.test.ts`
- Modify: `convex/aggregates.ts`
- Modify: `convex/convex.config.ts`
- Modify: `convex/triggers.ts`
- Modify: `convex/adminUsageCostAggregation.ts`
- Modify: `convex/adminUsageCostAggregateQuery.ts`
- Modify: `convex/adminUsageCosts.ts`

**Interfaces:**
- Produces: `agentTokenAggregator`, summing `Doc<"rawAgentUsage">["usage"]["totalTokens"]` with `agentCostNamespace` and `agentCostSortKey`.
- Produces: `totalTokens: number` on cost aggregate inputs, accumulators, month options, and serialized report rows.

- [ ] **Step 1: Extend the backend test with failing token expectations**

Register the new component in `convex/adminUsageCosts.test.ts`, insert each fixture into both aggregates, and expect exact all-time and monthly token totals, including `220` for the first user's three all-time requests and `120` for its first model fixture.

- [ ] **Step 2: Run the focused backend test and verify RED**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/adminUsageCosts.test.ts`

Expected: FAIL because `agentTokenAggregator` and `totalTokens` do not exist.

- [ ] **Step 3: Add the permanent aggregate and carry token totals through aggregation**

Add:

```ts
export const agentTokenAggregator = new TableAggregate<{
  Key: AgentCostSortKey;
  DataModel: DataModel;
  TableName: "rawAgentUsage";
  Namespace: string;
}>(components.agentTokenUsage, {
  sortKey: agentCostSortKey,
  sumValue: (doc) => doc.usage.totalTokens,
  namespace: agentCostNamespace,
});
```

Register `agentTokenUsage` in `convex.config.ts`, use `agentTokenAggregator.idempotentTrigger()` during migration, request token sums beside cost sums for all-time and monthly bounds, and add them to every accumulator and serialized row.

- [ ] **Step 4: Generate Convex types and run the focused backend test**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx convex codegen`

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/adminUsageCosts.test.ts`

Expected: PASS.

### Task 2: Frontend model, summary card, and table columns

**Files:**
- Modify: `src/components/admin/adminUsageCostsModel.test.ts`
- Modify: `src/components/admin/adminUsageCostsModel.ts`
- Modify: `src/components/admin/AdminUsageCostControls.tsx`
- Modify: `src/components/admin/AdminUsageCostsTab.tsx`

**Interfaces:**
- Consumes: report rows with `totalTokens: number`.
- Produces: `formatTokenCount(value: number, compact?: boolean): string` and `totalTokens` from `buildUserSpendSummary`.

- [ ] **Step 1: Add failing model tests**

Add `totalTokens` to fixtures and assert that the summary totals them, `formatTokenCount(1_250_000)` returns `1,250,000`, `formatTokenCount(1_250_000, true)` returns a compact value, and `compareValues` sorts token totals numerically.

- [ ] **Step 2: Run the focused frontend test and verify RED**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/admin/adminUsageCostsModel.test.ts`

Expected: FAIL because token fields and formatting are absent.

- [ ] **Step 3: Implement model helpers and UI**

Add `totalTokens` to user, model, monthly, and month-option types and both sort-key unions. Add a fourth summary card labeled `Total tokens`, change the summary grid to four columns at the large breakpoint, and add right-aligned sortable Tokens columns to both table grids.

- [ ] **Step 4: Run focused frontend and backend tests**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/admin/adminUsageCostsModel.test.ts convex/adminUsageCosts.test.ts`

Expected: PASS.

### Task 3: Temporary retry-safe aggregate backfill

**Files:**
- Create temporarily: `convex/backfillAgentTokenUsage.ts`
- Create temporarily: `convex/backfillAgentTokenUsage.test.ts`

**Interfaces:**
- Produces temporarily: internal mutation `backfillBatch({ cursor, numItems }) -> { processed, continueCursor, isDone }`.
- Produces temporarily: internal query `verify()` returning raw and aggregate counts/totals for reportable namespaces.

- [ ] **Step 1: Write failing pagination and retry tests**

Insert multiple raw rows without the token aggregate, run a two-item batch, resume with its cursor, rerun safely, and assert aggregate count and sum equal the raw fixtures exactly once.

- [ ] **Step 2: Run the migration test and verify RED**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/backfillAgentTokenUsage.test.ts`

Expected: FAIL because the temporary migration module is absent.

- [ ] **Step 3: Implement bounded cursor backfill and verification**

Paginate `rawAgentUsage`, call `agentTokenAggregator.insertIfDoesNotExist(ctx, row)` for each page item, and return the pagination cursor. Verification must independently paginate raw rows and compare reportable raw count/token totals with aggregate totals without `.collect()`.

- [ ] **Step 4: Run migration and regression tests**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/backfillAgentTokenUsage.test.ts convex/adminUsageCosts.test.ts src/components/admin/adminUsageCostsModel.test.ts`

Expected: PASS.

### Task 4: Deploy, backfill, verify, and clean up

**Files:**
- Delete after verification: `convex/backfillAgentTokenUsage.ts`
- Delete after verification: `convex/backfillAgentTokenUsage.test.ts`
- Modify after verification: `convex/triggers.ts`
- Update: `CONTINUITY.md`

**Interfaces:**
- Final trigger: `agentTokenAggregator.trigger()`.
- Final repository: no `backfillAgentTokenUsage` symbol or file.

- [ ] **Step 1: Confirm the target deployment and deploy the migration phase**

Inspect the configured Convex deployment. Deploy the aggregate, idempotent trigger, UI report, and temporary migration to the intended data-bearing deployment.

- [ ] **Step 2: Run every backfill page until complete**

Invoke the internal backfill with a bounded batch size, pass each returned cursor to the next invocation, and stop only when `isDone` is true. Record processed totals.

- [ ] **Step 3: Verify before cleanup**

Run the temporary verifier. Require raw reportable count and total tokens to equal aggregate count and total tokens. Query the admin report and confirm all-time and monthly token totals are nonnegative and populated.

- [ ] **Step 4: Remove migration code and tighten the trigger**

Delete both temporary files, change `idempotentTrigger()` to `trigger()`, regenerate Convex types, and confirm `rg -n "backfillAgentTokenUsage|backfillBatch" convex` returns no matches.

- [ ] **Step 5: Run final verification and deploy cleanup**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/adminUsageCosts.test.ts src/components/admin/adminUsageCostsModel.test.ts`

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bun run build`

Expected: tests and build PASS. Deploy the cleanup phase, then re-query the admin report to confirm token totals remain available.

- [ ] **Step 6: Record final state**

Update `CONTINUITY.md` with the aggregate design, deployment/backfill receipts, verification totals, and confirmation that temporary migration code was removed.
