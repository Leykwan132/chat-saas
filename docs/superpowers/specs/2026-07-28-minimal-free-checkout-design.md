# Minimal Free Checkout

## Goal

Selecting Free from onboarding or Pricing opens Stripe Checkout for the reusable RM0 subscription price.

## Design

- Reuse `api.stripe.createCheckout`; do not add another backend action.
- Read the Free price from `STRIPE_PRICE_FREE`.
- For Free only, omit the billing interval, set `payment_method_collection` to `if_required`, and disable promotion codes.
- Route both existing Free buttons through the same Checkout action and redirect to the returned URL.
- Preserve paid subscriptions and credit top-up behavior unchanged.

## Scope

No new tests, eligibility layer, lifecycle refactor, deletion behavior, or production configuration changes.
