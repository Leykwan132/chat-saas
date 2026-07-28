# Upgrade and Manage Billing Actions

## Goal

Make the signed-in billing actions communicate their purpose clearly while keeping plan selection separate from billing administration.

## Design

The credit-meter action keeps the `Upgrade` label and opens the shared Adjust Plan picker. Lucide's `CircleArrowUp` appears after the label at the existing icon size.

Settings → Plan keeps `Adjust plan` as the primary action. A borderless text-style `Manage billing` action appears beside it with Lucide's `ExternalLink` before the label.

`Manage billing` reserves a new browser tab synchronously from the click, then opens Stripe Customer Portal in that tab after the Portal session is created. The Settings page remains in its original tab.

Both Settings actions share the provider's billing-loading state. While Stripe is opening, both actions are disabled and `Manage billing` replaces its external-link icon with the existing spinner.

## Behavior Boundaries

- `Upgrade` continues to open the Adjust Plan picker.
- `Adjust plan` continues to open the Adjust Plan picker.
- `Manage billing` bypasses the picker and opens Stripe Customer Portal in a new tab.
- Checkout, team-Free warnings, cancellation routing, public Pricing, and onboarding remain unchanged.

## Error Handling

If the browser blocks the new tab, the app shows an error and does not request a Portal session. If Portal creation fails after reserving the tab, the app closes that tab and uses the existing provider-owned billing error toast.

## Verification

- Focused behavior tests cover successful new-tab navigation, blocked popups, and cleanup after Portal failure.
- Existing Adjust Plan routing tests remain green.
- TypeScript, scoped lint, and the production build verify integration.
