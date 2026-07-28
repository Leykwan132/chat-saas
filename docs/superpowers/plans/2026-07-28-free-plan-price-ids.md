# First-Class Free Stripe Plan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make monthly and annual Free Stripe prices the billing ground truth for new Free subscriptions and safe in-place downgrades of existing subscriptions.

**Architecture:** Extend the shared Stripe price catalog to include Free, keep new subscriptions on a focused no-card Checkout action, and add a separate authenticated downgrade action that replaces the sole existing subscription item through Stripe’s Subscription Update API. A focused internal mutation synchronizes the active Free subscription, resets plan credits, and invokes the existing idempotent team-deletion workflow only after Stripe succeeds.

**Tech Stack:** TypeScript 6, React 19, Convex, Stripe Node SDK 20, Vitest, convex-test, Bun, Node.js 22.

## Global Constraints

- Use `STRIPE_PRICE_FREE_MONTHLY=price_1Ty6SbK76D19hnMo7CvDgb4Y`.
- Use `STRIPE_PRICE_FREE_ANNUAL=price_1Ty6SyK76D19hnMob9D4sv3X`.
- New Free subscriptions use Checkout with `payment_method_collection: "if_required"` and no promotion codes.
- Existing subscriptions downgrade by replacing their current subscription item; they must not create a second subscription.
- Team downgrades warn before the action, update Stripe before deletion, preserve purchased and referral credits, delete the team workspace, and return the user to Personal.
- Personal downgrades preserve personal workspace data.
- Do not touch production Stripe or production Convex.
- Use Node.js 22 for every script and test.
- Keep every code file below 300 lines and avoid adding source comments.
- Preserve unrelated local edits in `convex/plans.ts`.

---

## File Structure

- `convex/planStripe.ts`: environment-backed Stripe plan-price catalog and reverse price lookup.
- `convex/planStripe.test.ts`: monthly/annual Free price lookup and reverse resolution.
- `convex/stripeCheckout.ts`: reusable Checkout request builder using existing Stripe price IDs only.
- `convex/stripeCheckout.test.ts`: no-card Free Checkout request contract.
- `convex/freeCheckout.ts`: authenticated new-Free-subscription Checkout action.
- `convex/freePlanSubscriptionUpdate.ts`: pure validation and Stripe update-parameter builder for one-item subscription replacement.
- `convex/freePlanSubscriptionUpdate.test.ts`: unit coverage for item replacement and invalid subscription shapes.
- `convex/freePlanDowngrade.ts`: authenticated Stripe downgrade action plus trusted Convex finalization mutation.
- `convex/freePlanDowngrade.test.ts`: Convex state-transition coverage for personal and team downgrades.
- `convex/teamDeletion/request.ts`: optional owner-subscription preservation when deletion follows an in-place Free downgrade.
- `convex/teamSubscriptionDeletion.test.ts`: regression coverage for preserved active Free billing state and existing cancellation behavior.
- `src/components/OnboardingFlow.tsx`: send the selected Free billing interval to Checkout.
- `src/pages/PricingPage.tsx`: send the selected Free billing interval to Checkout.
- `src/components/AdjustPlanDialog.tsx`: directly downgrade existing subscriptions and restore the team confirmation flow.
- `src/components/billing/ConfirmTeamDowngradeDialog.test.tsx`: settings-flow source contract.
- `CONTINUITY.md`: record the verified, unreleased implementation and development configuration.

### Task 1: Add Free to the Stripe price catalog

**Files:**
- Create: `convex/planStripe.test.ts`
- Modify: `convex/planStripe.ts`

**Interfaces:**
- Consumes: `PlanKey` and `BillingInterval` from `shared/planCatalog.ts`.
- Produces: `getStripePriceId(plan: PlanKey, interval: BillingInterval): string` and `resolvePlanKeyFromStripePriceId(priceId: string): PlanKey`.

- [ ] **Step 1: Write the failing price-catalog test**

```ts
import { beforeEach, describe, expect, test, vi } from "vitest";

const prices = {
  STRIPE_PRICE_FREE_MONTHLY: "price_free_monthly",
  STRIPE_PRICE_FREE_ANNUAL: "price_free_annual",
  STRIPE_PRICE_STARTER_MONTHLY: "price_starter_monthly",
  STRIPE_PRICE_STARTER_ANNUAL: "price_starter_annual",
  STRIPE_PRICE_GROWTH_MONTHLY: "price_growth_monthly",
  STRIPE_PRICE_GROWTH_ANNUAL: "price_growth_annual",
  STRIPE_PRICE_BUSINESS_MONTHLY: "price_business_monthly",
  STRIPE_PRICE_BUSINESS_ANNUAL: "price_business_annual",
};

beforeEach(() => {
  vi.resetModules();
  Object.assign(process.env, prices);
});

describe("Free Stripe prices", () => {
  test("resolve both billing intervals in both directions", async () => {
    const { getStripePriceId, resolvePlanKeyFromStripePriceId } =
      await import("./planStripe");

    expect(getStripePriceId("free", "monthly")).toBe("price_free_monthly");
    expect(getStripePriceId("free", "annual")).toBe("price_free_annual");
    expect(resolvePlanKeyFromStripePriceId("price_free_monthly")).toBe("free");
    expect(resolvePlanKeyFromStripePriceId("price_free_annual")).toBe("free");
  });
});
```

- [ ] **Step 2: Run the focused test and confirm the existing paid-only types fail**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/planStripe.test.ts
```

Expected: FAIL because `"free"` is not accepted by `getStripePriceId` and is not included in the reverse resolver.

- [ ] **Step 3: Extend the catalog with the aligned Free environment names**

```ts
export const STRIPE_PRICE_IDS: Record<
  PlanKey,
  Record<BillingInterval, string>
> = {
  free: {
    monthly: requireEnvVar("STRIPE_PRICE_FREE_MONTHLY"),
    annual: requireEnvVar("STRIPE_PRICE_FREE_ANNUAL"),
  },
  starter: {
    monthly: requireEnvVar("STRIPE_PRICE_STARTER_MONTHLY"),
    annual: requireEnvVar("STRIPE_PRICE_STARTER_ANNUAL"),
  },
  growth: {
    monthly: requireEnvVar("STRIPE_PRICE_GROWTH_MONTHLY"),
    annual: requireEnvVar("STRIPE_PRICE_GROWTH_ANNUAL"),
  },
  business: {
    monthly: requireEnvVar("STRIPE_PRICE_BUSINESS_MONTHLY"),
    annual: requireEnvVar("STRIPE_PRICE_BUSINESS_ANNUAL"),
  },
};

export function getStripePriceId(
  plan: PlanKey,
  interval: BillingInterval,
): string {
  return STRIPE_PRICE_IDS[plan][interval];
}

export function resolvePlanKeyFromStripePriceId(priceId: string): PlanKey {
  for (const plan of ["free", "starter", "growth", "business"] as const) {
    if (
      STRIPE_PRICE_IDS[plan].monthly === priceId ||
      STRIPE_PRICE_IDS[plan].annual === priceId
    ) {
      return plan;
    }
  }
  throw new Error(`Unknown Stripe price ID: ${priceId}`);
}
```

- [ ] **Step 4: Run the price-catalog and existing plan-resolution tests**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/planStripe.test.ts convex/userPlan.test.ts convex/latestStripeSubscription.test.ts
```

Expected: PASS, including active Free price resolution and latest-subscription selection behavior.

- [ ] **Step 5: Commit the catalog**

```bash
git add convex/planStripe.ts convex/planStripe.test.ts
git commit -m "Add Free Stripe price catalog"
```

### Task 2: Use configured Free prices for new-subscription Checkout

**Files:**
- Modify: `convex/stripeCheckout.ts`
- Modify: `convex/stripeCheckout.test.ts`
- Modify: `convex/freeCheckout.ts`
- Modify: `src/components/OnboardingFlow.tsx`
- Modify: `src/pages/PricingPage.tsx`

**Interfaces:**
- Consumes: `getStripePriceId("free", interval)` from Task 1.
- Produces: `api.freeCheckout.create({ cancelPath, interval })` returning `{ sessionId, url }`.

- [ ] **Step 1: Add a failing Checkout request test**

```ts
test("Free checkout uses its configured price without collecting a card", () => {
  const params = buildCheckoutSessionCreateParams({
    ...baseCheckoutArgs,
    priceId: "price_free_annual",
    mode: "subscription",
    subscriptionMetadata: { orgId: "user_test" },
    paymentMethodCollection: "if_required",
    allowPromotionCodes: false,
  });

  expect(params.line_items).toEqual([
    { price: "price_free_annual", quantity: 1 },
  ]);
  expect(params.payment_method_collection).toBe("if_required");
  expect(params.allow_promotion_codes).toBe(false);
});
```

- [ ] **Step 2: Run the focused test before removing inline price support**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/stripeCheckout.test.ts
```

Expected: PASS for the new contract, establishing the behavior that the refactor must preserve.

- [ ] **Step 3: Make reusable Checkout accept only an existing price ID**

```ts
export type CheckoutSessionParams = {
  priceId: string;
  customerId: string;
  mode: "subscription" | "payment";
  successUrl: string;
  cancelUrl: string;
  metadata: CheckoutMetadata;
  subscriptionMetadata?: CheckoutMetadata;
  paymentIntentMetadata?: CheckoutMetadata;
  paymentMethodCollection?: "always" | "if_required";
  allowPromotionCodes?: boolean;
};

const sessionParams: Stripe.Checkout.SessionCreateParams = {
  mode: args.mode,
  line_items: [{ price: args.priceId, quantity: 1 }],
  success_url: args.successUrl,
  cancel_url: args.cancelUrl,
  customer: args.customerId,
  metadata: args.metadata,
  allow_promotion_codes: args.allowPromotionCodes ?? true,
};
```

- [ ] **Step 4: Replace inline Free price data with the selected configured price**

```ts
export const create = action({
  args: {
    cancelPath: v.string(),
    interval: v.union(v.literal("monthly"), v.literal("annual")),
  },
  handler: async (ctx, args) => {
    const priceId = getStripePriceId("free", args.interval);

    return await createCheckoutSessionWithPromotionCodes({
      priceId,
      customerId: customer.customerId,
      mode: "subscription",
      successUrl: `${frontendUrl}/workspace?success=true`,
      cancelUrl: `${frontendUrl}${args.cancelPath}`,
      metadata: { orgId: userId, type: "subscription" },
      subscriptionMetadata: { orgId: userId },
      paymentMethodCollection: "if_required",
      allowPromotionCodes: false,
    });
  },
});
```

- [ ] **Step 5: Pass the active interval from onboarding and Pricing**

```ts
const session = await createFreeCheckout({
  cancelPath: "/onboarding",
  interval: billingInterval,
});
```

```ts
const session = await createFreeCheckout({
  cancelPath: planReturnPath,
  interval: billingInterval,
});
```

- [ ] **Step 6: Run focused tests and lint the changed files**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/stripeCheckout.test.ts convex/planStripe.test.ts && bunx eslint convex/stripeCheckout.ts convex/stripeCheckout.test.ts convex/freeCheckout.ts src/components/OnboardingFlow.tsx src/pages/PricingPage.tsx
```

Expected: all tests and lint checks PASS.

- [ ] **Step 7: Commit new-subscription Free Checkout**

```bash
git add convex/stripeCheckout.ts convex/stripeCheckout.test.ts convex/freeCheckout.ts src/components/OnboardingFlow.tsx src/pages/PricingPage.tsx
git commit -m "Use configured Free prices in Checkout"
```

### Task 3: Build safe existing-subscription replacement

**Files:**
- Create: `convex/freePlanSubscriptionUpdate.ts`
- Create: `convex/freePlanSubscriptionUpdate.test.ts`
- Create: `convex/freePlanDowngrade.ts`

**Interfaces:**
- Consumes: authenticated billing identity, the user’s stored subscription ID, `getStripePriceId("free", interval)`, and Stripe SDK 20.
- Produces: `buildFreePlanSubscriptionUpdate(subscription, priceId, userId): Stripe.SubscriptionUpdateParams` and `api.freePlanDowngrade.execute({ interval })`.

- [ ] **Step 1: Write failing unit tests for exact item replacement**

```ts
import { describe, expect, test } from "vitest";
import { buildFreePlanSubscriptionUpdate } from "./freePlanSubscriptionUpdate";

describe("Free subscription update", () => {
  test("replaces the sole current item without proration", () => {
    const params = buildFreePlanSubscriptionUpdate(
      {
        items: { data: [{ id: "si_current" }] },
        metadata: { previous: "value" },
      },
      "price_free_monthly",
      "user_owner",
    );

    expect(params).toEqual({
      items: [{ id: "si_current", price: "price_free_monthly", quantity: 1 }],
      metadata: { previous: "value", orgId: "user_owner" },
      proration_behavior: "none",
      cancel_at_period_end: false,
    });
  });

  test.each([[], [{ id: "si_one" }, { id: "si_two" }]])(
    "rejects an unsafe subscription item shape",
    (items) => {
      expect(() =>
        buildFreePlanSubscriptionUpdate(
          { items: { data: items }, metadata: {} },
          "price_free_monthly",
          "user_owner",
        ),
      ).toThrow("exactly one subscription item");
    },
  );
});
```

- [ ] **Step 2: Run the unit test and verify it fails because the module is absent**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/freePlanSubscriptionUpdate.test.ts
```

Expected: FAIL because `freePlanSubscriptionUpdate.ts` does not exist.

- [ ] **Step 3: Implement the pure request builder**

```ts
import type Stripe from "stripe";

type SubscriptionShape = Pick<Stripe.Subscription, "items" | "metadata">;

export function buildFreePlanSubscriptionUpdate(
  subscription: SubscriptionShape,
  priceId: string,
  userId: string,
): Stripe.SubscriptionUpdateParams {
  if (subscription.items.data.length !== 1) {
    throw new Error("Expected exactly one subscription item");
  }

  return {
    items: [{
      id: subscription.items.data[0].id,
      price: priceId,
      quantity: 1,
    }],
    metadata: { ...subscription.metadata, orgId: userId },
    proration_behavior: "none",
    cancel_at_period_end: false,
  };
}
```

- [ ] **Step 4: Add the authenticated downgrade action**

```ts
"use node";

export const execute = action({
  args: {
    interval: v.union(v.literal("monthly"), v.literal("annual")),
  },
  handler: async (ctx, args) => {
    const auth = await getAuthContext(ctx);
    const user = await ctx.runQuery(internal.freePlanDowngrade.getContext, {});
    if (!user.stripeSubscriptionId) {
      throw new Error("No active Stripe subscription found");
    }

    const stripe = new Stripe(requireStripeSecretKey());
    const subscription = await stripe.subscriptions.retrieve(
      user.stripeSubscriptionId,
    );
    const priceId = getStripePriceId("free", args.interval);
    const updated = await stripe.subscriptions.update(
      subscription.id,
      buildFreePlanSubscriptionUpdate(subscription, priceId, auth.userId),
    );
    const item = updated.items.data[0];

    await ctx.runMutation(internal.freePlanDowngrade.finalize, {
      stripeSubscriptionId: updated.id,
      stripeCustomerId:
        typeof updated.customer === "string" ? updated.customer : updated.customer.id,
      status: updated.status,
      priceId,
      currentPeriodEnd: item.current_period_end,
      activeOrgId: auth.orgId,
    });

    return { redirectToPersonal: user.isTeam };
  },
});
```

The internal `getContext` query must derive the authenticated user, current stored subscription, and active workspace server-side. It accepts no IDs from the client. The action must validate that the updated subscription still has exactly one item and that Stripe returned the requested Free price before finalization.

- [ ] **Step 5: Run the pure builder tests**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/freePlanSubscriptionUpdate.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit the safe Stripe update boundary**

```bash
git add convex/freePlanSubscriptionUpdate.ts convex/freePlanSubscriptionUpdate.test.ts convex/freePlanDowngrade.ts
git commit -m "Add safe Free subscription downgrade"
```

### Task 4: Finalize Free state and delete only team workspaces

**Files:**
- Modify: `convex/freePlanDowngrade.ts`
- Create: `convex/freePlanDowngrade.test.ts`
- Modify: `convex/teamDeletion/request.ts`
- Modify: `convex/teamSubscriptionDeletion.test.ts`

**Interfaces:**
- Consumes: successful Stripe update payload from Task 3 and `requestTeamDeletion`.
- Produces: `internal.freePlanDowngrade.finalize` and `requestTeamDeletion(..., { preserveOwnerSubscription: true })`.

- [ ] **Step 1: Write failing Convex tests for personal and team finalization**

```ts
test("personal downgrade keeps personal data and resets only plan credits", async () => {
  const result = await t.mutation(internal.freePlanDowngrade.finalize, {
    stripeSubscriptionId: "sub_free",
    stripeCustomerId: "cus_owner",
    status: "active",
    priceId: "price_free_monthly",
    currentPeriodEnd: 1_900_000_000,
    activeOrgId: "",
  });

  expect(result).toEqual({ redirectToPersonal: false });
  expect(state.user.stripeSubscriptionId).toBe("sub_free");
  expect(state.user.stripePriceId).toBe("price_free_monthly");
  expect(state.personalTeam).not.toBeNull();
  expect(state.credits).toMatchObject({
    grantedCredits: 50,
    usedCredits: 0,
    planKey: "free",
  });
  expect(state.purchasedCredits).toBe(previousPurchasedCredits);
});

test("team downgrade preserves active Free billing and queues deletion once", async () => {
  await t.mutation(internal.freePlanDowngrade.finalize, args);
  await t.mutation(internal.freePlanDowngrade.finalize, args);

  expect(state.user.stripeSubscriptionId).toBe("sub_free");
  expect(state.user.stripeSubscriptionStatus).toBe("active");
  expect(state.team.deletionStatus).toBe("deleting");
  expect(state.deletionJobs).toHaveLength(1);
  expect(state.credits.grantedCredits).toBe(50);
});
```

- [ ] **Step 2: Run the focused Convex tests and verify the missing finalizer behavior**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/freePlanDowngrade.test.ts convex/teamSubscriptionDeletion.test.ts
```

Expected: FAIL until the finalizer and preservation option exist.

- [ ] **Step 3: Add a trusted finalization mutation**

```ts
export const finalize = internalMutation({
  args: {
    stripeSubscriptionId: v.string(),
    stripeCustomerId: v.string(),
    status: v.string(),
    priceId: v.string(),
    currentPeriodEnd: v.number(),
    activeOrgId: v.string(),
  },
  handler: async (ctx, args) => {
    const auth = await getAuthContext(ctx);
    const user = await getBillingUser(ctx, auth.userId);
    const personalTeam = await getPersonalTeamForUser(ctx, user._id);
    if (!personalTeam) {
      throw new Error("Personal workspace not found");
    }

    await ctx.db.patch(user._id, {
      activeTeamId: personalTeam._id,
      stripeCustomerId: args.stripeCustomerId,
      stripeSubscriptionId: args.stripeSubscriptionId,
      stripePriceId: args.priceId,
      stripeSubscriptionStatus: args.status,
      stripeSubscriptionCurrentPeriodEnd: args.currentPeriodEnd * 1000,
      updatedAt: Date.now(),
    });
    await ctx.db.patch(personalTeam._id, {
      stripeSubscriptionId: args.stripeSubscriptionId,
      updatedAt: Date.now(),
    });
    await resetCurrentPeriodToFreePlan(ctx, user._id);

    if (args.activeOrgId) {
      await requestTeamDeletion(ctx, {
        workosOrgId: args.activeOrgId,
        stripeSubscriptionId: args.stripeSubscriptionId,
        source: "stripe",
        preserveOwnerSubscription: true,
      });
    }

    return { redirectToPersonal: Boolean(args.activeOrgId) };
  },
});
```

The final implementation must compare the authenticated active organization with `args.activeOrgId` and verify that the requested Free price resolves to `"free"` before writing. Duplicate finalization must keep one deletion job and avoid duplicate credit resets/logs.

- [ ] **Step 4: Preserve owner billing only for explicit Free-downgrade deletion**

Extend the helper argument:

```ts
args: {
  workosOrgId: string;
  stripeSubscriptionId?: string;
  source: "stripe" | "workos";
  preserveOwnerSubscription?: boolean;
}
```

Guard the existing owner billing clear:

```ts
if (team.ownerId) {
  if (!args.preserveOwnerSubscription) {
    await ctx.db.patch(team.ownerId, {
      stripeSubscriptionId: undefined,
      stripePriceId: undefined,
      stripeSubscriptionStatus: "canceled",
      stripeSubscriptionCurrentPeriodEnd: undefined,
      updatedAt: now,
    });
  }
  await resetCurrentPeriodToFreePlan(ctx, team.ownerId);
}
```

Existing Stripe deletion and WorkOS deletion callers omit the option and retain their current behavior.

- [ ] **Step 5: Make credit reset idempotent for retry convergence**

Before writing or logging, return when the current period already has `planKey: "free"`, `grantedCredits: 50`, and `usedCredits: 0`. This prevents a successful Stripe update followed by a retried finalizer from creating duplicate adjustment logs while preserving all top-up entries.

- [ ] **Step 6: Run downgrade and deletion tests**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/freePlanDowngrade.test.ts convex/teamSubscriptionDeletion.test.ts
```

Expected: PASS for personal preservation, team cleanup, duplicate convergence, credit reset, and legacy cancellation behavior.

- [ ] **Step 7: Commit state finalization**

```bash
git add convex/freePlanDowngrade.ts convex/freePlanDowngrade.test.ts convex/teamDeletion/request.ts convex/teamSubscriptionDeletion.test.ts convex/creditPlanReset.ts
git commit -m "Finalize Free downgrades safely"
```

### Task 5: Restore the settings downgrade experience

**Files:**
- Modify: `src/components/AdjustPlanDialog.tsx`
- Modify: `src/components/billing/ConfirmTeamDowngradeDialog.test.tsx`

**Interfaces:**
- Consumes: `api.freePlanDowngrade.execute({ interval })` from Task 3 and `planAndUsage.isTeam`.
- Produces: personal direct downgrade, team confirmation, and Personal redirect.

- [ ] **Step 1: Update the source-contract test to require the new action**

```ts
test("only team downgrades to Free require confirmation", () => {
  expect(adjustPlanSource).toContain("api.freePlanDowngrade.execute");
  expect(adjustPlanSource).toContain("planAndUsage.isTeam");
  expect(adjustPlanSource).toContain("setConfirmDowngradeOpen(true)");
  expect(adjustPlanSource).toContain("<ConfirmTeamDowngradeDialog");
  expect(adjustPlanSource).toContain("await downgradeToFree");
  expect(adjustPlanSource).not.toContain("createFreeCheckout");
});
```

- [ ] **Step 2: Run the focused UI test and verify it fails against the demo flow**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/billing/ConfirmTeamDowngradeDialog.test.tsx
```

Expected: FAIL because Settings currently opens Free Checkout directly.

- [ ] **Step 3: Wire personal and team Free downgrade behavior**

```tsx
const downgradeToFree = useAction(api.freePlanDowngrade.execute);
const [confirmDowngradeOpen, setConfirmDowngradeOpen] = useState(false);
const [isFreeDowngradeLoading, setIsFreeDowngradeLoading] = useState(false);

const executeFreeDowngrade = async () => {
  setIsFreeDowngradeLoading(true);
  try {
    const result = await downgradeToFree({ interval: billingInterval });
    if (result.redirectToPersonal) {
      window.location.assign("/workspace");
      return;
    }
    setConfirmDowngradeOpen(false);
    onOpenChange(false);
    toast.success("Your plan is now Free.");
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Could not downgrade your plan.";
    toast.error(message);
  } finally {
    setIsFreeDowngradeLoading(false);
  }
};

const handleFreeSelection = () => {
  if (planAndUsage?.isTeam) {
    setConfirmDowngradeOpen(true);
    return;
  }
  void executeFreeDowngrade();
};
```

Render `ConfirmTeamDowngradeDialog` beside the plan dialog:

```tsx
<ConfirmTeamDowngradeDialog
  open={confirmDowngradeOpen}
  onOpenChange={setConfirmDowngradeOpen}
  onConfirm={executeFreeDowngrade}
  loading={isFreeDowngradeLoading}
/>
```

- [ ] **Step 4: Run focused UI verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/billing/ConfirmTeamDowngradeDialog.test.tsx && bunx eslint src/components/AdjustPlanDialog.tsx src/components/billing/ConfirmTeamDowngradeDialog.tsx src/components/billing/ConfirmTeamDowngradeDialog.test.tsx
```

Expected: test and lint PASS.

- [ ] **Step 5: Commit the settings experience**

```bash
git add src/components/AdjustPlanDialog.tsx src/components/billing/ConfirmTeamDowngradeDialog.test.tsx
git commit -m "Restore safe Free downgrade experience"
```

### Task 6: Configure development and verify the complete feature

**Files:**
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: all prior tasks.
- Produces: configured development environment and verified generated Convex API.

- [ ] **Step 1: Set both Free price IDs on the configured development deployment**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx convex env set STRIPE_PRICE_FREE_MONTHLY price_1Ty6SbK76D19hnMo7CvDgb4Y
source ~/.nvm/nvm.sh && nvm use 22 && bunx convex env set STRIPE_PRICE_FREE_ANNUAL price_1Ty6SyK76D19hnMob9D4sv3X
```

Expected: both commands confirm the variables were set on the configured development deployment.

- [ ] **Step 2: Read back the development values**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx convex env get STRIPE_PRICE_FREE_MONTHLY
source ~/.nvm/nvm.sh && nvm use 22 && bunx convex env get STRIPE_PRICE_FREE_ANNUAL
```

Expected: exact monthly and annual IDs from Global Constraints.

- [ ] **Step 3: Generate and upload Convex functions**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx convex codegen
```

Expected: generated API includes `freePlanDowngrade`, TypeScript validation passes, and the configured development deployment accepts the functions.

- [ ] **Step 4: Run the complete focused regression suite**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/planStripe.test.ts convex/stripeCheckout.test.ts convex/freePlanSubscriptionUpdate.test.ts convex/freePlanDowngrade.test.ts convex/userPlan.test.ts convex/latestStripeSubscription.test.ts convex/teamSubscriptionDeletion.test.ts src/components/billing/ConfirmTeamDowngradeDialog.test.tsx
```

Expected: all focused tests PASS.

- [ ] **Step 5: Run scoped lint, whitespace, and line-limit checks**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint convex/planStripe.ts convex/planStripe.test.ts convex/stripeCheckout.ts convex/stripeCheckout.test.ts convex/freeCheckout.ts convex/freePlanSubscriptionUpdate.ts convex/freePlanSubscriptionUpdate.test.ts convex/freePlanDowngrade.ts convex/freePlanDowngrade.test.ts convex/teamDeletion/request.ts convex/teamSubscriptionDeletion.test.ts convex/creditPlanReset.ts src/components/OnboardingFlow.tsx src/pages/PricingPage.tsx src/components/AdjustPlanDialog.tsx src/components/billing/ConfirmTeamDowngradeDialog.test.tsx
git diff --check
source ~/.nvm/nvm.sh && nvm use 22 && awk 'FNR==1{if (NR>1 && lines>300) print previous, lines; previous=FILENAME; lines=0} {lines++} END{if (lines>300) print previous, lines}' convex/planStripe.ts convex/stripeCheckout.ts convex/freeCheckout.ts convex/freePlanSubscriptionUpdate.ts convex/freePlanDowngrade.ts convex/teamDeletion/request.ts convex/creditPlanReset.ts src/components/AdjustPlanDialog.tsx
```

Expected: lint and whitespace PASS; the line-limit command prints nothing.

- [ ] **Step 6: Inspect the final diff and preserve unrelated diagnostics**

Run:

```bash
git status --short
git diff --stat
git diff -- convex/plans.ts
```

Expected: the only `convex/plans.ts` changes remain the user-owned diagnostic logs and are neither modified nor staged.

- [ ] **Step 7: Update the continuity ledger**

Record the verified feature as unreleased, the exact development env configuration outcome, test receipts, and working set. Do not add a public changelog entry because production availability is unconfirmed.

- [ ] **Step 8: Commit verification metadata**

```bash
git add CONTINUITY.md
git commit -m "Record Free Stripe plan verification"
```
