# Upgrade and Manage Billing Actions

## Goal

Make the signed-in billing actions communicate their purpose clearly without changing plan-selection behavior.

## Design

The credit-meter action keeps the `Upgrade` label and opens the shared Adjust Plan picker. Its settings cog is replaced with Lucide's `Rocket` icon at the existing size.

Settings → Plan keeps `Adjust plan` as the primary action. A secondary outline `Manage billing` action appears beside it and opens Stripe Customer Portal directly.

Both Settings actions share the provider's billing-loading state. While Stripe is opening, both actions are disabled and the action being initiated may show the existing spinner.

## Behavior Boundaries

- `Upgrade` continues to open the Adjust Plan picker.
- `Adjust plan` continues to open the Adjust Plan picker.
- `Manage billing` bypasses the picker and opens Stripe Customer Portal.
- Checkout, team-Free warnings, cancellation routing, public Pricing, and onboarding remain unchanged.

## Error Handling

Direct Portal errors use the existing provider-owned billing error messages and toast behavior.

## Verification

- A focused behavior test covers the new public provider action.
- Existing Adjust Plan routing tests remain green.
- TypeScript, scoped lint, and the production build verify integration.
