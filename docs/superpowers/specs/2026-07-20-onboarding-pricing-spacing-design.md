# Onboarding Pricing Spacing Design

## Goal

Make the onboarding plan-selection step use the same plan-section spacing and sizing as the current public pricing page.

## Scope

The onboarding plan-selection step will share the public pricing page's:

- title typography;
- title-to-plan-picker gap;
- default plan-picker density;
- billing-toggle spacing;
- card grid gaps;
- card header, feature, and footer spacing.

The onboarding page will retain its existing shell, fixed header, Back action, checkout behavior, loading state, and responsive maximum width.

## Design

Extract the title and content wrapper into a small shared plan-selection layout component. Both `PricingPage` and the plan step in `OnboardingFlow` will render their existing `SubscriptionPlanPicker` through this component.

The shared component will own the public pricing page's current `gap-10` section spacing and heading classes. Onboarding will stop passing `density="compact"` so the shared picker follows the same default-density path as pricing.

The plan picker itself will remain the source of billing-toggle, grid, card, feature-list, and action spacing. No separate onboarding spacing values will be introduced.

## Alternatives Considered

### Copy pricing classes into onboarding

This is the smallest edit, but duplicated spacing and typography can drift later.

### Match only the outer title gap

This preserves shorter onboarding cards, but it does not satisfy exact parity because compact density changes the toggle, grid, headers, features, and footers.

### Shared layout and shared default density

This is the selected approach. It gives both screens one layout contract while preserving their distinct actions and page shells.

## Testing

A focused source contract will fail while onboarding uses its local title wrapper or compact density. It will then verify:

- pricing and onboarding both use the shared plan-selection layout;
- onboarding no longer requests compact picker density;
- the shared layout owns the pricing page's current section gap and heading typography.

After the focused test passes, run the relevant frontend test set, a production build, `git diff --check`, and the code-file length check.

## Out of Scope

- Pricing copy, plan features, prices, or billing behavior.
- Onboarding steps before plan selection.
- Changes to the page shell or Back button placement.
- Convex schema or backend changes.
