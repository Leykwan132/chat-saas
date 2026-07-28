# Free Plan Stripe Checkout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route eligible Free-plan signup through Stripe-hosted Checkout with a reusable RM0 MYR subscription price and no payment-method form.

**Architecture:** Extend the existing price and Checkout parameter boundaries so Free is an explicit subscription price with `payment_method_collection: "if_required"`. Keep `api.stripe.createCheckout` stable while moving its implementation and the oversized Stripe lifecycle bodies into focused modules. Both frontend entrypoints use the same backend action, while paid users are prevented from creating a parallel Free subscription.

**Tech Stack:** TypeScript, Convex, Stripe Node SDK, React, WorkOS AuthKit, Vitest

## Global Constraints

- Node.js 22 is required for every script and test command.
- Use one reusable Stripe test-mode product named `Kilobot Free`.
- Use one active recurring monthly price with `currency: "myr"` and `unit_amount: 0`.
- Store the test price ID only in the configured development Convex environment as `STRIPE_PRICE_FREE`.
- Free subscription Checkout must set `payment_method_collection: "if_required"` and omit promotion-code entry.
- Paid subscription and credit top-up Checkout parameters must remain unchanged.
- Paid customers must use workspace Plan settings instead of creating a parallel Free subscription.
- Preserve the public `api.stripe.createCheckout` and internal `internal.stripe.*` function references.
- All new or touched code modules must contain at most 300 lines.
- Do not modify or commit the existing local `console.log("subscriptions", ...)` or `console.log("stripeInfo", ...)` diagnostics in `convex/plans.ts`.
- Production Stripe, production Convex, and the public changelog are out of scope.

---

### Task 1: Add the Free subscription price and Checkout parameter contract

**Files:**
- Modify: `convex/planStripe.ts`
- Modify: `convex/stripeCheckout.ts`
- Modify: `convex/stripeCheckout.test.ts`
- Create: `convex/stripeFreePrice.test.ts`

**Interfaces:**
- Consumes: `PlanKey`, `BillingInterval`, and the existing paid Stripe price environment values.
- Produces: `getStripeSubscriptionPriceId(plan: PlanKey, interval?: BillingInterval): string`.
- Produces: `resolvePlanKeyFromStripePriceId(priceId: string): PlanKey`.
- Extends: `CheckoutSessionParams` with `paymentMethodCollection?: "always" | "if_required"` and `allowPromotionCodes?: boolean`.

- [ ] **Step 1: Write the failing Free price tests**

Create `convex/stripeFreePrice.test.ts`:

```ts
import { beforeEach, expect, test } from "vitest";
import {
  getStripeSubscriptionPriceId,
  resolvePlanKeyFromStripePriceId,
} from "./planStripe";

beforeEach(() => {
  process.env.STRIPE_PRICE_FREE = "price_free";
});

test("resolves the reusable Free subscription price", () => {
  expect(getStripeSubscriptionPriceId("free")).toBe("price_free");
  expect(resolvePlanKeyFromStripePriceId("price_free")).toBe("free");
});

test("requires a configured Free price when starting Free Checkout", () => {
  delete process.env.STRIPE_PRICE_FREE;
  expect(() => getStripeSubscriptionPriceId("free")).toThrow(
    "Missing required environment variable: STRIPE_PRICE_FREE",
  );
});
```

- [ ] **Step 2: Extend the Checkout parameter regression**

Add to `convex/stripeCheckout.test.ts`:

```ts
test("Free subscription Checkout skips payment collection and promotions", () => {
  const params = buildCheckoutSessionCreateParams({
    ...baseCheckoutArgs,
    priceId: "price_free",
    mode: "subscription",
    subscriptionMetadata: { orgId: "user_test" },
    paymentMethodCollection: "if_required",
    allowPromotionCodes: false,
  });

  expect(params.payment_method_collection).toBe("if_required");
  expect(params.allow_promotion_codes).toBe(false);
});
```

- [ ] **Step 3: Run the tests and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/stripeFreePrice.test.ts convex/stripeCheckout.test.ts
```

Expected: FAIL because `getStripeSubscriptionPriceId` and the new Checkout parameter fields do not exist.

- [ ] **Step 4: Implement the Free price mapping**

In `convex/planStripe.ts`, keep `getStripePriceId` stable and add:

```ts
export function getStripeSubscriptionPriceId(
  plan: PlanKey,
  interval?: BillingInterval,
): string {
  if (plan === "free") {
    return requireEnvVar("STRIPE_PRICE_FREE");
  }
  if (!interval) {
    throw new Error(`Billing interval is required for ${plan}`);
  }
  return getStripePriceId(plan, interval);
}
```

Change `resolvePlanKeyFromStripePriceId` to return `PlanKey` and recognize the optional Free environment value before checking paid prices:

```ts
const freePriceId = process.env.STRIPE_PRICE_FREE;
if (freePriceId && priceId === freePriceId) {
  return "free";
}
```

Do not require `STRIPE_PRICE_FREE` at module import time; unrelated paid tests and deployments must remain loadable until Free Checkout is invoked.

- [ ] **Step 5: Implement the Checkout parameter fields**

In `convex/stripeCheckout.ts`, extend `CheckoutSessionParams` and build the Stripe request with:

```ts
allow_promotion_codes: args.allowPromotionCodes ?? true,
```

Then add:

```ts
if (args.paymentMethodCollection) {
  sessionParams.payment_method_collection = args.paymentMethodCollection;
}
```

- [ ] **Step 6: Run the focused tests and verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/stripeFreePrice.test.ts convex/stripeCheckout.test.ts convex/userPlan.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit the price and parameter boundary**

```bash
git add convex/planStripe.ts convex/stripeCheckout.ts convex/stripeCheckout.test.ts convex/stripeFreePrice.test.ts
git commit -m "Support Free Stripe Checkout parameters"
```

---

### Task 2: Route Free through the existing backend Checkout action

**Files:**
- Create: `convex/stripeCheckoutAction.ts`
- Create: `convex/stripeCheckoutAction.test.ts`
- Modify: `convex/stripe.ts`

**Interfaces:**
- Consumes: `getStripeSubscriptionPriceId`, `createCheckoutSessionWithPromotionCodes`, `internal.plans.internalGetPlanFromStripe`, and authenticated billing identity.
- Produces: `createCheckoutForBillingUser(ctx: ActionCtx, args: CheckoutActionArgs)`.
- Produces: `assertFreeCheckoutEligible(plan: PlanKey, status?: string): void`.
- Preserves: `api.stripe.createCheckout`.

- [ ] **Step 1: Write the failing eligibility and selection tests**

Create `convex/stripeCheckoutAction.test.ts`:

```ts
import { beforeEach, expect, test } from "vitest";
import {
  assertFreeCheckoutEligible,
  resolveCheckoutProduct,
} from "./stripeCheckoutAction";

beforeEach(() => {
  process.env.STRIPE_PRICE_FREE = "price_free";
});

test("builds a payment-free Free subscription selection", () => {
  expect(
    resolveCheckoutProduct({
      plan: "free",
      mode: "subscription",
    }),
  ).toEqual({
    priceId: "price_free",
    paymentMethodCollection: "if_required",
    allowPromotionCodes: false,
    creditMetadata: null,
  });
});

test("keeps paid subscription Checkout unchanged", () => {
  process.env.STRIPE_PRICE_GROWTH_MONTHLY = "price_growth_monthly";
  expect(
    resolveCheckoutProduct({
      plan: "growth",
      interval: "monthly",
      mode: "subscription",
    }),
  ).toMatchObject({
    priceId: "price_growth_monthly",
    paymentMethodCollection: undefined,
    allowPromotionCodes: true,
  });
});

test("blocks a paid customer from creating a second Free subscription", () => {
  expect(() => assertFreeCheckoutEligible("growth", "active")).toThrow(
    "Manage your paid subscription from workspace Plan settings",
  );
  expect(() => assertFreeCheckoutEligible("free", "active")).not.toThrow();
  expect(() => assertFreeCheckoutEligible("free", "canceled")).not.toThrow();
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/stripeCheckoutAction.test.ts
```

Expected: FAIL because `stripeCheckoutAction.ts` does not exist.

- [ ] **Step 3: Implement the pure Checkout selection**

Create `convex/stripeCheckoutAction.ts` with these public types:

```ts
export type CheckoutActionArgs = {
  plan?: string;
  interval?: "monthly" | "annual";
  mode: "subscription" | "payment";
  extraCreditsPackId?: ExtraCreditsPackId;
  orgId?: string | null;
  cancelPath?: string;
};

export function assertFreeCheckoutEligible(
  plan: PlanKey,
  status?: string,
): void {
  const active = status === "active" || status === "trialing";
  if (active && plan !== "free") {
    throw new Error(
      "Manage your paid subscription from workspace Plan settings",
    );
  }
}
```

Implement `resolveCheckoutProduct` so Free returns the exact object asserted above, paid subscriptions require a valid paid plan plus interval, and payments retain the existing extra-credit pack metadata.

- [ ] **Step 4: Implement the authenticated action helper**

Move the current `createCheckout` handler body into:

```ts
export async function createCheckoutForBillingUser(
  ctx: ActionCtx,
  args: CheckoutActionArgs,
) {
```

Before creating a Free session, call:

```ts
const currentPlan = await ctx.runQuery(
  internal.plans.internalGetPlanFromStripe,
  { entityId: userId },
);
assertFreeCheckoutEligible(currentPlan.plan, currentPlan.status);
```

Build `CheckoutSessionParams` with the selection's `paymentMethodCollection` and `allowPromotionCodes`. Preserve customer creation, metadata, success URL, cancel URL, paid subscription metadata, and top-up payment-intent metadata.

- [ ] **Step 5: Keep the public action entrypoint stable**

In `convex/stripe.ts`, retain the existing validator and replace only its handler body:

```ts
handler: async (ctx, args) => {
  return await createCheckoutForBillingUser(ctx, args);
},
```

- [ ] **Step 6: Run focused tests and verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/stripeCheckoutAction.test.ts convex/stripeCheckout.test.ts convex/stripeTopUp.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit the backend Free Checkout route**

```bash
git add convex/stripe.ts convex/stripeCheckoutAction.ts convex/stripeCheckoutAction.test.ts
git commit -m "Route Free signup through Stripe Checkout"
```

---

### Task 3: Use Free Checkout from onboarding and Pricing

**Files:**
- Modify: `src/components/OnboardingFlow.tsx`
- Modify: `src/pages/PricingPage.tsx`
- Create: `src/lib/freeCheckoutFlow.test.ts`

**Interfaces:**
- Consumes: `api.stripe.createCheckout`, `api.users.currentUser`, and `/workspace/settings?section=plan`.
- Produces: one Free Checkout request shape from each eligible entrypoint.

- [ ] **Step 1: Write the failing frontend source contract**

Create `src/lib/freeCheckoutFlow.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

const onboarding = readFileSync(
  new URL("../components/OnboardingFlow.tsx", import.meta.url),
  "utf8",
);
const pricing = readFileSync(
  new URL("../pages/PricingPage.tsx", import.meta.url),
  "utf8",
);

test("onboarding sends Free selection to Stripe Checkout", () => {
  expect(onboarding).not.toContain("api.stripe.createStripeCustomer");
  expect(onboarding).toContain("plan: planKey");
  expect(onboarding).toContain("mode: 'subscription'");
  expect(onboarding).toContain("cancelPath: '/onboarding'");
});

test("Pricing sends eligible Free selection to Checkout and paid users to billing", () => {
  expect(pricing).not.toContain("api.stripe.createStripeCustomer");
  expect(pricing).toContain("useQuery(api.users.currentUser)");
  expect(pricing).toContain("plan: plan");
  expect(pricing).toContain("cancelPath: '/pricing'");
  expect(pricing).toContain(
    "window.location.assign('/workspace/settings?section=plan')",
  );
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/lib/freeCheckoutFlow.test.ts
```

Expected: FAIL because both pages still call `createStripeCustomer`.

- [ ] **Step 3: Update onboarding**

Remove the `createStripeCustomer` action and the Free-only bypass. Use the existing subscription request for every `PlanKey`:

```ts
const session = await createCheckout({
  plan: planKey,
  interval: planKey === "free" ? undefined : billingInterval,
  mode: "subscription",
  orgId: "personal",
  cancelPath: "/onboarding",
});
```

Use `toast.loading("Opening secure checkout…")` before the request. Keep the existing missing-URL error and Stripe navigation.

- [ ] **Step 4: Update Pricing**

Import `useQuery`, read `api.users.currentUser`, and remove `createStripeCustomer`.

Before starting Free Checkout:

```ts
if (plan === "free" && currentUser?.plan !== "free") {
  window.location.assign("/workspace/settings?section=plan");
  return;
}
```

Send every eligible plan through:

```ts
const session = await createCheckoutSession({
  plan,
  interval: plan === "free" ? undefined : billingInterval,
  mode: "subscription",
  orgId: "personal",
  cancelPath: "/pricing",
});
```

Keep unauthenticated WorkOS signup, loading state recovery, PostHog capture, missing-URL handling, and Stripe navigation.

- [ ] **Step 5: Run frontend and regression tests**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/lib/freeCheckoutFlow.test.ts src/components/pricing/PlanSelectionLayout.test.ts src/router/ReferralFeatureRoute.test.ts src/lib/referralAnalyticsEvents.test.ts
```

Expected: the new Free Checkout contract passes. Record the existing referral source-regex baseline separately if it remains unchanged.

- [ ] **Step 6: Run scoped lint**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/components/OnboardingFlow.tsx src/pages/PricingPage.tsx src/lib/freeCheckoutFlow.test.ts
```

Expected: no new lint errors. If `OnboardingFlow.tsx` reports its known existing hook errors, compare the same command against `HEAD^` and record only unchanged findings.

- [ ] **Step 7: Commit the frontend entrypoints**

```bash
git add src/components/OnboardingFlow.tsx src/pages/PricingPage.tsx src/lib/freeCheckoutFlow.test.ts
git commit -m "Open Free signup in Stripe Checkout"
```

---

### Task 4: Split the Stripe lifecycle module below the project limit

**Files:**
- Create: `convex/stripeSubscriptionLifecycle.ts`
- Create: `convex/stripeTopUpLifecycle.ts`
- Modify: `convex/stripe.ts`
- Test: `convex/teamSubscriptionDeletion.test.ts`
- Test: `convex/stripeTopUp.test.ts`
- Test: `convex/stripeCheckoutAction.test.ts`

**Interfaces:**
- Produces: `handleSubscriptionUpdated(ctx: MutationCtx, args: SubscriptionUpdatedArgs)`.
- Produces: `handleSubscriptionDeleted(ctx: MutationCtx, args: SubscriptionDeletedArgs)`.
- Produces: `handlePaymentIntentSucceeded(ctx: MutationCtx, args: PaymentIntentSucceededArgs)`.
- Preserves: every existing validator and `internal.stripe.*` function reference.

- [ ] **Step 1: Establish the green refactor baseline**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/teamSubscriptionDeletion.test.ts convex/stripeTopUp.test.ts convex/stripeCheckoutAction.test.ts
```

Expected: PASS before moving code.

- [ ] **Step 2: Extract subscription lifecycle bodies**

Move the bodies of `handleSubscriptionUpdatedInternal` and `handleSubscriptionDeletedInternal` into `convex/stripeSubscriptionLifecycle.ts` with explicit argument types. Keep the validators and registrations in `convex/stripe.ts`:

```ts
handler: async (ctx, args) => {
  return await handleSubscriptionUpdated(ctx, args);
},
```

```ts
handler: async (ctx, args) => {
  return await handleSubscriptionDeleted(ctx, args);
},
```

Do not change cancellation, team deletion, owner metadata, credit-period, or credit-log behavior.

- [ ] **Step 3: Extract top-up processing**

Move the `handlePaymentIntentSucceededInternal` body into `convex/stripeTopUpLifecycle.ts` and delegate from the existing registered mutation:

```ts
handler: async (ctx, args) => {
  return await handlePaymentIntentSucceeded(ctx, args);
},
```

Preserve duplicate-payment detection, top-up entry creation, credit logs, and processed-payment insertion.

- [ ] **Step 4: Verify the module boundary**

Run:

```bash
wc -l convex/stripe.ts convex/stripeCheckoutAction.ts convex/stripeSubscriptionLifecycle.ts convex/stripeTopUpLifecycle.ts
```

Expected: every listed file is at most 300 lines.

- [ ] **Step 5: Run the refactor regressions**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/teamSubscriptionDeletion.test.ts convex/stripeTopUp.test.ts convex/stripeCheckoutAction.test.ts convex/stripeCheckout.test.ts convex/userPlan.test.ts
```

Expected: PASS with the same results as the baseline.

- [ ] **Step 6: Run scoped lint**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint convex/stripe.ts convex/stripeCheckoutAction.ts convex/stripeSubscriptionLifecycle.ts convex/stripeTopUpLifecycle.ts
```

Expected: PASS.

- [ ] **Step 7: Commit the modular Stripe lifecycle**

```bash
git add convex/stripe.ts convex/stripeSubscriptionLifecycle.ts convex/stripeTopUpLifecycle.ts
git commit -m "Modularize Stripe lifecycle handlers"
```

---

### Task 5: Provision the reusable Stripe test catalog entry

**Files:**
- Create: `scripts/stripeFreeCatalog.ts`
- Create: `scripts/stripeFreeCatalog.test.ts`
- Create: `scripts/ensureStripeFreeTestPrice.ts`

**Interfaces:**
- Consumes: `STRIPE_SECRET_KEY`.
- Produces: JSON on stdout with `{ productId: string; priceId: string; reusedProduct: boolean; reusedPrice: boolean }`.
- Mutates: Stripe test catalog only.

- [ ] **Step 1: Write the failing catalog-selection tests**

Create `scripts/stripeFreeCatalog.test.ts`:

```ts
import { expect, test } from "vitest";
import {
  findKilobotFreePrice,
  findKilobotFreeProduct,
  isStripeTestSecret,
} from "./stripeFreeCatalog";

test("accepts only Stripe test secrets", () => {
  expect(isStripeTestSecret("sk_test_example")).toBe(true);
  expect(isStripeTestSecret("rk_test_example")).toBe(true);
  expect(isStripeTestSecret("sk_live_example")).toBe(false);
});

test("selects only the exact active Free catalog entries", () => {
  expect(
    findKilobotFreeProduct([
      { id: "prod_old", name: "Free", active: true },
      { id: "prod_free", name: "Kilobot Free", active: true },
    ]),
  ).toMatchObject({ id: "prod_free" });

  expect(
    findKilobotFreePrice([
      {
        id: "price_wrong",
        active: true,
        currency: "usd",
        unit_amount: 0,
        recurring: { interval: "month" },
      },
      {
        id: "price_free",
        active: true,
        currency: "myr",
        unit_amount: 0,
        recurring: { interval: "month" },
      },
    ]),
  ).toMatchObject({ id: "price_free" });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run scripts/stripeFreeCatalog.test.ts
```

Expected: FAIL because the catalog module does not exist.

- [ ] **Step 3: Implement the pure catalog selectors**

Create `scripts/stripeFreeCatalog.ts` with exact-name, active, currency, amount, and monthly recurrence matching. `findKilobotFreeProduct` and `findKilobotFreePrice` return the first exact match or `undefined`. `isStripeTestSecret` accepts only `sk_test_` and `rk_test_` prefixes.

- [ ] **Step 4: Implement the idempotent provisioning script**

Create `scripts/ensureStripeFreeTestPrice.ts`:

```ts
import Stripe from "stripe";
import {
  findKilobotFreePrice,
  findKilobotFreeProduct,
  isStripeTestSecret,
} from "./stripeFreeCatalog";

const secret = process.env.STRIPE_SECRET_KEY;
if (!secret || !isStripeTestSecret(secret)) {
  throw new Error("A Stripe test-mode secret is required");
}

const stripe = new Stripe(secret);
const products = await stripe.products.list({ active: true, limit: 100 });
let product = findKilobotFreeProduct(products.data);
const reusedProduct = Boolean(product);
product ??= await stripe.products.create({ name: "Kilobot Free" });

const prices = await stripe.prices.list({
  active: true,
  product: product.id,
  type: "recurring",
  limit: 100,
});
let price = findKilobotFreePrice(prices.data);
const reusedPrice = Boolean(price);
price ??= await stripe.prices.create({
  product: product.id,
  currency: "myr",
  unit_amount: 0,
  recurring: { interval: "month" },
});

process.stdout.write(
  JSON.stringify({
    productId: product.id,
    priceId: price.id,
    reusedProduct,
    reusedPrice,
  }),
);
```

- [ ] **Step 5: Run the catalog tests and verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run scripts/stripeFreeCatalog.test.ts
```

Expected: PASS.

- [ ] **Step 6: Provision test mode and configure development**

Run without printing the Stripe secret:

```bash
source ~/.nvm/nvm.sh && nvm use 22
kilobot_stripe_test_secret="$(bunx convex env get STRIPE_SECRET_KEY)"
kilobot_free_catalog_json="$(STRIPE_SECRET_KEY="$kilobot_stripe_test_secret" bun scripts/ensureStripeFreeTestPrice.ts)"
kilobot_free_price_id="$(node -e 'const fs=require("fs"); process.stdout.write(JSON.parse(fs.readFileSync(0,"utf8")).priceId)' <<<"$kilobot_free_catalog_json")"
bunx convex env set STRIPE_PRICE_FREE "$kilobot_free_price_id"
```

Expected: the script refuses a live key, otherwise returns/reuses one exact test product and price, and the development environment receives that exact price ID.

- [ ] **Step 7: Commit the provisioning utility**

```bash
git add scripts/stripeFreeCatalog.ts scripts/stripeFreeCatalog.test.ts scripts/ensureStripeFreeTestPrice.ts
git commit -m "Add idempotent Free Stripe test catalog setup"
```

---

### Task 6: Upload, verify, and hand off the Checkout experience

**Files:**
- Modify: `CONTINUITY.md`
- Generated: `convex/_generated/api.d.ts`

**Interfaces:**
- Consumes: configured development `STRIPE_PRICE_FREE`.
- Produces: a development Stripe Checkout URL through the normal UI.

- [ ] **Step 1: Run focused feature verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/stripeFreePrice.test.ts convex/stripeCheckout.test.ts convex/stripeCheckoutAction.test.ts convex/userPlan.test.ts convex/teamSubscriptionDeletion.test.ts convex/stripeTopUp.test.ts src/lib/freeCheckoutFlow.test.ts src/components/pricing/PlanSelectionLayout.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run Convex codegen and development upload**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && STRIPE_PRICE_FREE=mock_free STRIPE_PRICE_STARTER_MONTHLY=mock_starter_monthly STRIPE_PRICE_STARTER_ANNUAL=mock_starter_annual STRIPE_PRICE_GROWTH_MONTHLY=mock_growth_monthly STRIPE_PRICE_GROWTH_ANNUAL=mock_growth_annual STRIPE_PRICE_BUSINESS_MONTHLY=mock_business_monthly STRIPE_PRICE_BUSINESS_ANNUAL=mock_business_annual STRIPE_PRICE_EXTRA_CREDITS_2000=mock_extra_2000 STRIPE_PRICE_EXTRA_CREDITS_5000=mock_extra_5000 STRIPE_PRICE_EXTRA_CREDITS_15000=mock_extra_15000 bunx convex codegen
```

Expected: component discovery, function upload to the configured development deployment, generated bindings, and TypeScript all succeed.

- [ ] **Step 3: Run final static verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint convex/planStripe.ts convex/stripeCheckout.ts convex/stripeCheckoutAction.ts convex/stripeSubscriptionLifecycle.ts convex/stripeTopUpLifecycle.ts src/components/OnboardingFlow.tsx src/pages/PricingPage.tsx scripts/stripeFreeCatalog.ts scripts/ensureStripeFreeTestPrice.ts
git diff --check
wc -l convex/stripe.ts convex/stripeCheckoutAction.ts convex/stripeSubscriptionLifecycle.ts convex/stripeTopUpLifecycle.ts src/components/OnboardingFlow.tsx src/pages/PricingPage.tsx scripts/stripeFreeCatalog.ts scripts/ensureStripeFreeTestPrice.ts
```

Expected: no new lint errors, no whitespace errors, and every touched code module at most 300 lines.

- [ ] **Step 4: Start or reuse the local application**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bun run dev --host 127.0.0.1 --port 5178
```

Expected: Vite serves the application at `http://127.0.0.1:5178`.

- [ ] **Step 5: Verify the live development flow**

Using an authenticated development test user without an active paid subscription:

1. Open onboarding or Pricing.
2. Select Free.
3. Confirm navigation to Stripe-hosted Checkout.
4. Confirm the line item is RM0 and no payment-method form appears.
5. Complete Checkout.
6. Confirm redirect to `/workspace?success=true`.
7. Read the development Stripe component subscription and confirm the latest row is `active` with `priceId` equal to `STRIPE_PRICE_FREE`.
8. Read the user's current credit period and confirm `planKey: "free"`, `grantedCredits: 50`, and `usedCredits: 0`.

- [ ] **Step 6: Record the verified state**

Update `CONTINUITY.md` with:

- test product and price provisioning outcome without secret values;
- RED/GREEN test evidence;
- configured-development upload outcome;
- live Checkout result;
- explicit confirmation that production and the public changelog were untouched.

- [ ] **Step 7: Commit final bindings and continuity**

```bash
git add convex/_generated/api.d.ts CONTINUITY.md
git commit -m "Record Free Checkout development verification"
```

- [ ] **Step 8: Preserve unrelated local work**

Run:

```bash
git status --short
git diff -- convex/plans.ts
```

Expected: only the user's pre-existing `subscriptions` and `stripeInfo` diagnostics remain uncommitted.
