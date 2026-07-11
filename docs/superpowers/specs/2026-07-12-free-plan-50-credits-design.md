# Free Plan 50 Credits Design

## Goal

Reduce the Free plan's recurring monthly allowance from 100 credits to 50 credits while preserving the existing credit-based usage system.

## Scope

- Set `PLAN_CATALOG.free.monthlyCredits` to `50`.
- Change the Free plan feature summary to `50 credits / mo`.
- Change the pricing FAQ to state that Free includes 50 credits per month.
- Keep Starter, Growth, Business, purchased credits, and credit costs unchanged.
- Do not introduce a separate message-count limit.

## Credit Lifecycle

The shared plan catalog remains the entitlement source of truth. New Free credit periods and future monthly resets receive 50 credits through the existing credit-period grant flow.

Existing Free credit periods are not rewritten or capped mid-cycle. Their already-granted balance remains available until the current period ends, after which the next Free grant uses the new 50-credit allowance.

## Presentation

Pricing and usage surfaces that derive their values from `PLAN_CATALOG.free.monthlyCredits` will automatically show 50. The hard-coded Free plan feature summary and pricing FAQ will be updated explicitly so public copy agrees with enforcement.

## Verification

- Add a focused regression assertion that the Free plan grants 50 monthly credits.
- Assert that the Free plan feature summary advertises 50 credits per month.
- Verify that no active customer-facing copy still advertises 100 Free credits.
- Run the focused test under Node.js 22 and check the edited files for formatting issues.
