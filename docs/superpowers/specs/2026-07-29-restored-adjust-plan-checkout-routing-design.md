# Restored Adjust Plan and Canceled Checkout Routing

## Goal

Restore the signed-in Adjust Plan experience while keeping Stripe as the billing source of truth. Active subscriptions continue through Stripe Portal. Customers whose latest subscription is canceled, cancelled, or absent start a new Checkout subscription because Stripe Portal cannot change a terminated subscription.

## User-facing labels

Labels describe the action in its immediate context:

- The credit meter uses **Upgrade**.
- Settings → Plan uses **Adjust plan**.
- Locked-feature cards use **Change plan**.
- Plan cards inside Adjust Plan use **Current plan** for the selected tier and **Change plan** for another tier.

These entrypoints open the same root-owned Adjust Plan experience.

## Adjust Plan experience

The application restores a full-screen plan picker using the existing shared subscription plan cards. It shows monthly and annual intervals, plan features, the current plan, and Enterprise contact handling.

The picker is owned at the authenticated application root. Feature cards and settings surfaces call one stable `openAdjustPlan()` interface instead of mounting dialogs locally. This prevents dialog stacking and keeps loading, errors, billing state, and redirects consistent.

Only one billing dialog is visible at a time. When a team owner selects Free, the plan picker closes before the destructive confirmation opens. Going back returns to the plan picker. Confirming continues to Stripe Portal; no local downgrade occurs before Stripe reports the subscription update.

## Subscription routing

`plans.getPlanAndUsage` already returns the latest Stripe subscription status. The root flow uses that value when a non-current paid plan is selected:

- `active` or `trialing`: create a Stripe customer Portal session.
- `canceled`, `cancelled`, or no subscription: create a Stripe Checkout session for the selected paid plan and billing interval.
- Other non-terminal statuses continue through Stripe Portal so customers can resolve payment or subscription state without creating a parallel subscription.

Checkout receives the selected paid plan, interval, and current signed-in return path. Portal receives the current signed-in return path. Public Pricing and onboarding keep their existing Checkout behavior.

An active team subscription selecting Free first receives the destructive team warning. After confirmation, Stripe Portal owns the plan change. The existing `customer.subscription.updated` Free-price handler remains responsible for blocking and deleting the workspace, moving users to Personal, disconnecting channels, and resetting Plan credits to 50.

## Components

The current root billing provider becomes the owner of:

- Adjust Plan open state.
- Selected billing interval.
- Subscription-status routing.
- Portal and Checkout session creation.
- Team Free confirmation state.
- Shared loading and error feedback.

The restored plan picker is a presentation component controlled by the provider. It does not query billing independently or mount its own confirmation dialog.

Signed-in callers use the shared context with their approved contextual label. The old local-dialog pattern and nested confirmation structure remain retired.

## Error handling

Session creation failures keep the user in the application and show a concise error toast. Duplicate clicks are disabled while a request is running. Missing billing data or insufficient billing permissions produces the existing owner/profile feedback without opening the picker.

Checkout is never used merely because Portal creation fails. Routing depends only on the latest stored subscription status, preventing accidental parallel subscriptions.

## Verification

Focused tests cover:

- Contextual labels on the credit meter, Settings, and locked-feature card.
- Every signed-in entrypoint opening the shared Adjust Plan picker.
- Active and trialing statuses routing to Portal.
- Canceled, cancelled, and missing subscriptions routing selected paid plans to Checkout.
- Other statuses remaining on Portal.
- Team Free selection swapping from the plan picker to one warning and returning on **Go back**.
- Public Pricing and onboarding retaining Checkout.
- Stable Stripe and Convex function entrypoints.
- Existing Free-price update cleanup remaining idempotent.

The authenticated browser check must confirm that the picker is visible, no nested overlay appears, canceled paid-plan selection opens Checkout, and active selection opens Portal. Production remains untouched until release is explicitly authorized.
