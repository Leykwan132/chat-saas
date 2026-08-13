# Pricing Top-up FAQ Design

## Goal

Make the Pricing page answer the immediate follow-up to running out of credits by showing the currently purchasable top-up packages and their carry-forward policy.

## Placement and copy

- Expand the existing `What happens if I use up my credits?` FAQ rather than adding another accordion row.
- Lead with the three available packages: 2,000 credits for RM49, 5,000 credits for RM99, and 15,000 credits for RM249.
- State that top-up credits carry forward and do not expire.
- Retain the existing explanation that AI usage pauses when credits run out until the customer tops up, reaches the next billing cycle, or upgrades.
- Keep the answer concise enough for the Pricing page’s existing accordion layout.

## Data flow

- Build the package portion of the FAQ answer from `EXTRA_CREDITS_PACKS` and `formatExtraCreditsPackPrice` in `shared/extraCreditsCatalog.ts`.
- Reuse `EXTRA_CREDITS_PACK_NOTE` for the carry-forward policy rather than duplicating package values or policy text in the Pricing content module.
- Keep `pricingFaqs` as the single content collection consumed by `PricingFaqSection`.

## Verification

- Update the existing Pricing FAQ regression to assert the customer-visible answer contains all three package/price pairs, the carry-forward policy, and the existing paused-usage choices.
- Run the focused Pricing FAQ test, scoped ESLint, the Node 22 production build, and `git diff --check`.

## Release state

Production availability remains unconfirmed. The public changelog stays unchanged until the release date is confirmed.
