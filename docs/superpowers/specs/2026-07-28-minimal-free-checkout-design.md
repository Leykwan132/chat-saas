# Minimal Free Checkout

## Goal

Selecting Free from onboarding, Pricing, or Settings → Plan opens Stripe Checkout with an inline RM0 monthly subscription price.

## Design

- Add one focused `api.freeCheckout.create` action so the existing oversized Stripe module stays untouched.
- Define the Free Checkout line item inline as MYR 0, recurring monthly, named `Kilobot Free`.
- For Free only, omit the billing interval, set `payment_method_collection` to `if_required`, and disable promotion codes.
- Route the onboarding, Pricing, and Settings → Plan Free buttons through the Free Checkout action and redirect to the returned URL.
- Preserve paid subscriptions and credit top-up behavior unchanged.
- Settings → Plan intentionally opens a new Free Checkout without canceling an existing paid subscription.

## Scope

No new tests, eligibility layer, lifecycle refactor, deletion behavior, or production configuration changes.
