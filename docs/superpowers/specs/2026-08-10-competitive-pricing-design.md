# Competitive Pricing Design

## Goal

Publish the approved self-serve offer: Free 300 credits, Starter RM79/2,000 credits, Growth RM299/8,000 credits, and Business RM499/20,000 credits. Top-up packs stay unchanged.

## Source of truth

`shared/planCatalog.ts` remains the authority for self-serve prices and monthly entitlement grants. Customer-facing FAQs, downgrade warnings, upgrade prompts, and the Early Adopter Growth benefit must agree with it.

## Stripe rollout

Create six new recurring MYR Prices under the existing Starter, Growth, and Business Products. Do not change Free or top-up Prices. Migrate the three existing subscription items to their matching new Price with no proration, unchanged billing anchors, and unchanged discounts. A remaining Early Adopter coupon must make invoices free until expiry, then reveal the new lower renewal amount.

## Safety

Do not deploy the public price copy before checkout points at the new Price IDs. Verify a coupon user with an invoice preview before the three-user migration. No existing credit balance is rewritten; the revised allowance applies when the next credit period starts.
