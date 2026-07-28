# Signed-in Billing Portal Design

## Objective

Give every signed-in user one consistent **Manage plan** action. Stripe's customer portal becomes the only place where an existing subscriber changes plans.

Public pricing and onboarding continue using Checkout because they create the initial subscription.

## Current Problem

Signed-in billing currently mixes three flows:

- paid-plan Checkout;
- a custom Free downgrade action;
- Stripe's customer portal.

Team downgrades also attempt to open a confirmation dialog while the full-screen Adjust Plan dialog is still active. These nested modal layers can prevent the confirmation from appearing or receiving interaction.

## User Experience

### Common action

All signed-in plan-change actions use the label **Manage plan**.

The in-app Adjust Plan picker is no longer part of the signed-in billing flow. Upgrade prompts, usage surfaces, feature gates, and Settings route through one shared portal-opening interaction.

### Personal workspace

Selecting **Manage plan** creates a Stripe customer portal session and redirects the user to it immediately.

### Team workspace

Selecting **Manage plan** opens one warning dialog before any redirect. The dialog explains that changing the team to Free permanently removes:

- conversations and contacts;
- agents and their threads;
- connected channels and team workspace access.

The actions are **Go back** and **Continue anyway**.

**Continue anyway** creates a Stripe customer portal session and redirects to it. The portal is never opened underneath another dialog, and no second plan modal is mounted.

The warning appears whenever a user manages billing from an active team workspace because the application cannot know which plan change the user will choose after entering Stripe.

## Billing Boundaries

### Checkout

Checkout remains responsible only for initial subscription creation from onboarding and public pricing.

### Customer portal

The portal is responsible for every signed-in subscription change, including upgrades, paid-plan downgrades, interval changes, switching to Free, and cancellation.

The existing authenticated portal action remains the server boundary. It derives the billing identity from the authenticated user, requires an existing Stripe customer, and returns to the originating signed-in Plan settings route.

### Stripe events

Stripe remains the plan source of truth:

- `customer.subscription.updated` synchronizes the latest price and status;
- a transition to a configured Free price triggers the existing destructive team downgrade lifecycle;
- `customer.subscription.deleted` continues to resolve Free and trigger the same idempotent cleanup;
- paid upgrades update the current plan allocation through the existing credit synchronization behavior.

Both Free event paths must be idempotent so repeated or reordered Stripe delivery cannot delete unrelated data or reset credits twice.

## Components

### Shared portal launcher

A focused signed-in billing launcher owns:

- the **Manage plan** label;
- active-workspace team detection;
- warning-dialog state;
- portal-session loading and error handling;
- redirecting to the returned Stripe URL.

Consumers request plan management without selecting a target plan.

### Team warning dialog

The existing destructive-downgrade presentation is adapted into a portal-entry warning. It is mounted independently of the removed Adjust Plan dialog and never nests inside another modal.

### Legacy flow removal

Signed-in consumers stop opening `AdjustPlanDialog`. The custom client-side Free downgrade action is no longer invoked by signed-in UI. Backend functions may remain temporarily if required by other verified callers, but unused UI and modal composition are removed.

## Error Handling

- Portal creation shows a loading state and prevents duplicate requests.
- A missing portal URL produces a concise billing error.
- Action failures keep the user in the application and show a retryable toast.
- The team warning remains available after a failed portal request.
- No local plan or workspace data changes before a verified Stripe webhook.

## Verification

Tests will prove:

- signed-in plan-change controls display **Manage plan**;
- signed-in controls no longer launch Checkout or the Adjust Plan picker;
- personal-workspace management opens the portal directly;
- team-workspace management shows one warning dialog;
- **Go back** closes it without creating a portal session;
- **Continue anyway** creates the portal session without nested dialogs;
- a Stripe subscription update to a Free price enters the existing idempotent team cleanup path;
- subscription deletion retains the same Free cleanup behavior;
- paid subscription updates retain credit synchronization;
- onboarding and public pricing still use Checkout.

## Release Scope

This is an unreleased signed-in billing change. It will be recorded in the public changelog only after production availability is confirmed.
