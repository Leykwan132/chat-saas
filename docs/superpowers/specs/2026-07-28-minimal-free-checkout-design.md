# Minimal Free Checkout

## Goal

Selecting Free from onboarding, Pricing, or Settings → Plan opens Stripe Checkout for the reusable RM0 subscription price.

## Design

- Add one focused `api.freeCheckout.create` action so the existing oversized Stripe module stays untouched.
- Read the Free price from `STRIPE_PRICE_FREE`.
- For Free only, omit the billing interval, set `payment_method_collection` to `if_required`, and disable promotion codes.
- Route the onboarding, Pricing, and Settings → Plan Free buttons through the Free Checkout action and redirect to the returned URL.
- Preserve paid subscriptions and credit top-up behavior unchanged.
- Settings → Plan intentionally opens a new Free Checkout without canceling an existing paid subscription.

## Scope

No new tests, eligibility layer, lifecycle refactor, deletion behavior, or production configuration changes.
