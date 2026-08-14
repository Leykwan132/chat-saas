# AI Lead Temperature Pricing Design

## Goal

Present AI Lead Temperature as a standalone pricing feature directly above Advanced Analytics, with clear hover copy explaining the capability.

## Pricing presentation

- Rename the existing pricing label `Auto lead tagging` to `AI Lead Temperature`.
- Keep the existing Starter-and-up plan availability. This change does not alter feature flags, model processing, or customer lead-temperature behavior.
- Move the feature from the AI group into the Analytics group, immediately before Advanced Analytics in all plan cards and the comparison table.
- Advanced Analytics remains available on Growth, Business, and Enterprise. Its hover list contains only Common Topic Detection and Customer Sentiment.
- Add AI Lead Temperature to every eligible self-serve compact plan-card feature list. Growth places it immediately before Advanced Analytics; Starter and Business include it in their compact lists without changing their plan flags. Public pricing, onboarding, and the upgrade dialog consume these lists through `getPlanPickerCards()`.

## Hover content

The standalone hover title is `AI Lead Temperature` and continues to show Hot, Warm, and Cold. On Starter cards, its copy explains that classification runs once when a conversation is initially synced. On Growth and Business cards, its copy explains that the initial classification is refreshed daily for eligible active conversations with new messages. Comparison-table hover copy states both tiers' behavior.

## Verification

Focused pricing-catalog tests will assert the standalone label, analytics-group ordering, unchanged plan availability, compact-card placement, tier-specific hover copy, and Advanced Analytics' two-item hover list. No Convex code generation or migration is required because no backend interface changes.
