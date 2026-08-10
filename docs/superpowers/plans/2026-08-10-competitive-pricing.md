# Competitive Pricing Implementation Plan

## Goal

Implement the approved plan catalog and create the corresponding Stripe Prices without disrupting the three existing subscriptions.

1. Add contract tests for the plan catalog, upgrade prompts, Free FAQ, downgrade warning, and Early Adopter Growth copy.
2. Update `PLAN_CATALOG` and every identified customer-facing description to the approved prices and credits.
3. Run focused Node 22 Vitest coverage and stale-copy searches.
4. Create six recurring MYR Prices under the existing Stripe Products and update product descriptions/marketing features.
5. Manually move each existing subscription item to its matching new Price with `proration_behavior=none`, retaining coupon/discount fields and billing anchors.
6. Set the six paid Stripe Price environment variables, deploy the catalog, and verify new checkout plus all three current subscriptions.
