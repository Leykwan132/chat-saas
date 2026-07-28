# Latest Stripe Subscription Resolution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve a billing identity from exactly its most recently inserted Stripe subscription, regardless of subscription status.

**Architecture:** Replace the single-row `getSubscriptionByOrgId` lookup with `listSubscriptionsByOrgId`. Keep list-order interpretation in a small pure helper that returns the last row because the component query returns its `by_org_id` index in ascending insertion order.

**Tech Stack:** TypeScript, Convex, `@convex-dev/stripe`, Vitest

## Global Constraints

- Node.js 22 is required for every script and test command.
- The latest subscription row is authoritative; `active` and `trialing` receive no selection priority.
- Existing status-to-plan mapping remains unchanged after selecting the latest row.
- Do not modify the unrelated local `stripeInfo` diagnostic in `convex/plans.ts`.

---

### Task 1: Select the latest subscription row

**Files:**
- Create: `convex/latestStripeSubscription.ts`
- Create: `convex/latestStripeSubscription.test.ts`
- Modify: `convex/plans.ts`
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: `readonly T[]` in oldest-to-newest component list order.
- Produces: `selectLatestStripeSubscription<T>(subscriptions: readonly T[]): T | undefined`.

- [ ] **Step 1: Write the failing selector regression**

```ts
expect(
  selectLatestStripeSubscription([
    { id: "older", status: "active" },
    { id: "latest", status: "canceled" },
  ]),
).toEqual({ id: "latest", status: "canceled" });
```

Also cover a latest active row and an empty list.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/latestStripeSubscription.test.ts
```

Expected: FAIL because `latestStripeSubscription.ts` does not exist.

- [ ] **Step 3: Implement the pure selector**

```ts
export function selectLatestStripeSubscription<T>(
  subscriptions: readonly T[],
): T | undefined {
  return subscriptions[subscriptions.length - 1];
}
```

- [ ] **Step 4: Use the component list query**

In `getPlanFromStripe`, call `components.stripe.public.listSubscriptionsByOrgId`, pass its result through `selectLatestStripeSubscription`, and leave the existing active/trialing and Free mapping unchanged.

- [ ] **Step 5: Verify focused and related behavior**

Run the selector test, `convex/teamCanceledPlan.test.ts`, and `convex/teamSubscriptionDeletion.test.ts`, followed by Convex codegen/typecheck and `git diff --check`.

- [ ] **Step 6: Record and commit**

Update `CONTINUITY.md` with the latest-only decision, RED/GREEN receipt, development upload status, and production exclusion. Commit only the intended files.
