# AI Lead Temperature Pricing Design

## Goal

Present AI Lead Temperature as a standalone pricing feature directly above Advanced Analytics, with clear hover copy explaining the capability.

## Pricing presentation

- Rename the existing pricing label `Auto lead tagging` to `AI Lead Temperature`.
- Keep the existing Starter-and-up plan availability. This change does not alter feature flags, model processing, or customer lead-temperature behavior.
- Move the feature from the AI group into the Analytics group, immediately before Advanced Analytics in the detailed comparison table and the Growth compact card.
- Advanced Analytics remains available on Growth, Business, and Enterprise. Its hover list contains only Common Topic Detection and Customer Sentiment.
- Add AI Lead Temperature only to the Growth compact plan-card feature list, immediately before Advanced Analytics. Starter's one-time sync is represented accurately in the detailed comparison, while Business inherits Growth features through its “Everything in Growth, plus” card header without repeating the line. Public pricing, onboarding, and the upgrade dialog consume these lists through `getPlanPickerCards()`.

## Hover content

The standalone hover title is `AI Lead Temperature` and continues to show Hot, Warm, and Cold. The Growth card explains that eligible active conversations refresh daily when new messages arrive. The detailed comparison hover explains both the one-time Starter sync and the daily refresh available on Growth and higher plans.

## Verification

Focused pricing-catalog tests will assert the standalone label, analytics-group ordering, unchanged plan availability, compact-card placement, tier-specific hover copy, and Advanced Analytics' two-item hover list. No Convex code generation or migration is required because no backend interface changes.
