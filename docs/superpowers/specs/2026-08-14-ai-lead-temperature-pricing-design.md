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

The standalone hover title is `AI Lead Temperature`. Its description is: “AI analyzes customer conversations and classifies each lead as Hot, Warm, or Cold, helping your team prioritize follow-ups.” It continues to show the three classifications as the existing hover does.

## Verification

Focused pricing-catalog tests will assert the standalone label, analytics-group ordering, unchanged plan availability, compact-card placement, dedicated hover copy, and Advanced Analytics' two-item hover list. No Convex code generation or migration is required because no backend interface changes.
