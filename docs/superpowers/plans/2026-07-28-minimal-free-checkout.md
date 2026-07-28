# Minimal Free Checkout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Open Stripe Checkout when an authenticated user selects the Free plan.

**Architecture:** Extend the existing Checkout request with two optional Stripe parameters. Add one focused `api.freeCheckout.create` action because the existing Stripe module is already above the project line limit.

**Tech Stack:** TypeScript, Convex, Stripe, React

## Global Constraints

- Node.js 22 is required for script commands.
- Use the reusable `STRIPE_PRICE_FREE`.
- Free uses `payment_method_collection: "if_required"` and no promotion codes.
- Paid Checkout and credit top-ups remain unchanged.
- Do not add tests or refactor unrelated billing code.

---

### Task 1: Route Free through a focused Checkout action

**Files:**
- Create: `convex/freeCheckout.ts`
- Modify: `convex/stripeCheckout.ts`
- Modify: `src/components/OnboardingFlow.tsx`
- Modify: `src/pages/PricingPage.tsx`
- Modify: `src/components/AdjustPlanDialog.tsx`

**Interfaces:**
- Consumes: `STRIPE_PRICE_FREE` and `api.stripe.createCheckout`.
- Produces: `api.freeCheckout.create({ cancelPath: string })`.

- [ ] **Step 1: Add optional Free Checkout parameters**

Extend `CheckoutSessionParams` with `paymentMethodCollection` and `allowPromotionCodes`. Map them to Stripe while keeping promotion codes enabled by default.

- [ ] **Step 2: Create the Free Checkout action**

Create one authenticated action that requires `STRIPE_PRICE_FREE`, gets or creates the Stripe customer, and sets:

```ts
sessionParams.paymentMethodCollection = "if_required";
sessionParams.allowPromotionCodes = false;
```

- [ ] **Step 3: Route all Free buttons through Checkout**

Remove each `createStripeCustomer` Free bypass. Call `api.freeCheckout.create` for Free from onboarding, Pricing, and Settings → Plan while preserving the existing paid Checkout path.

- [ ] **Step 4: Perform static verification**

Run `git diff --check`, inspect the scoped diff, and confirm no new files beyond this plan and no test files were added.

- [ ] **Step 5: Commit**

```bash
git add convex/freeCheckout.ts convex/stripeCheckout.ts src/components/OnboardingFlow.tsx src/pages/PricingPage.tsx src/components/AdjustPlanDialog.tsx
git commit -m "Open Free plan in Stripe Checkout"
```
