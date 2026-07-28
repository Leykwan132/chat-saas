# Minimal Free Checkout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Open Stripe Checkout when an authenticated user selects the Free plan.

**Architecture:** Extend the existing Checkout request with two optional Stripe parameters. Reuse `api.stripe.createCheckout` and the existing Free buttons without adding modules or tests.

**Tech Stack:** TypeScript, Convex, Stripe, React

## Global Constraints

- Node.js 22 is required for script commands.
- Use the reusable `STRIPE_PRICE_FREE`.
- Free uses `payment_method_collection: "if_required"` and no promotion codes.
- Paid Checkout and credit top-ups remain unchanged.
- Do not add tests or refactor unrelated billing code.

---

### Task 1: Route Free through the existing Checkout action

**Files:**
- Modify: `convex/stripeCheckout.ts`
- Modify: `convex/stripe.ts`
- Modify: `src/components/OnboardingFlow.tsx`
- Modify: `src/pages/PricingPage.tsx`

**Interfaces:**
- Consumes: `STRIPE_PRICE_FREE` and `api.stripe.createCheckout`.
- Produces: the existing `{ sessionId, url }` Checkout result.

- [ ] **Step 1: Add optional Free Checkout parameters**

Extend `CheckoutSessionParams` with `paymentMethodCollection` and `allowPromotionCodes`. Map them to Stripe while keeping promotion codes enabled by default.

- [ ] **Step 2: Accept Free in `createCheckout`**

When `args.plan === "free"`, require `STRIPE_PRICE_FREE`, omit the paid interval requirement, and set:

```ts
sessionParams.paymentMethodCollection = "if_required";
sessionParams.allowPromotionCodes = false;
```

- [ ] **Step 3: Route both Free buttons through Checkout**

Remove each `createStripeCustomer` Free bypass. Call the existing Checkout action for every plan, passing `interval: undefined` for Free and preserving each page's cancel path.

- [ ] **Step 4: Perform static verification**

Run `git diff --check`, inspect the scoped diff, and confirm no new files beyond this plan and no test files were added.

- [ ] **Step 5: Commit**

```bash
git add convex/stripeCheckout.ts convex/stripe.ts src/components/OnboardingFlow.tsx src/pages/PricingPage.tsx
git commit -m "Open Free plan in Stripe Checkout"
```
