# Free Plan Price IDs

## Goal

Make Free a first-class Stripe subscription plan with monthly and annual price IDs. New Free subscriptions use Stripe Checkout without requiring a payment method. Existing paid subscriptions downgrade to Free by updating the current Stripe subscription rather than creating a second subscription.

## Stripe configuration

The configured development Convex deployment uses the same naming pattern as paid plans:

```text
STRIPE_PRICE_FREE_MONTHLY=price_1Ty6SbK76D19hnMo7CvDgb4Y
STRIPE_PRICE_FREE_ANNUAL=price_1Ty6SyK76D19hnMob9D4sv3X
```

These values are the ground truth for identifying Free subscriptions. The inline RM0 Checkout price is removed.

## Plan resolution

The Stripe price catalog contains monthly and annual IDs for every `PlanKey`, including Free. `getStripePriceId` accepts all plans, and `resolvePlanKeyFromStripePriceId` returns `PlanKey`.

An active or trialing subscription whose price matches either Free ID resolves to Free with its actual Stripe status and period end. Canceled subscriptions continue to resolve to Free under the existing cancellation rules.

Unknown price IDs remain errors at strict billing boundaries and retain existing defensive Free fallbacks where those already exist.

## New subscriptions

Onboarding and authenticated Pricing selections create a Stripe Checkout Session using the selected Free monthly or annual price ID.

Free Checkout sets:

- `mode: "subscription"`
- `payment_method_collection: "if_required"`
- `allow_promotion_codes: false`
- subscription metadata with the billing user ID

Stripe therefore omits payment collection when the Free price requires no payment. Paid Checkout behavior remains unchanged.

## Existing subscription downgrade

Stripe Checkout Session creation cannot update an existing subscription. Stripe’s `subscription_data` configures a newly created subscription and does not accept `subscription_id`.

Settings → Plan therefore uses Stripe’s Subscription Update API for a Free downgrade:

1. Derive the authenticated billing user server-side.
2. Resolve the user’s current Stripe subscription without accepting a subscription ID from the client.
3. Retrieve the subscription’s existing item ID.
4. Replace that item’s price with the selected Free monthly or annual price.
5. Use no proration for the immediate destructive downgrade.
6. Update subscription metadata so the active Free subscription belongs to the personal billing identity.

The update returns to Settings → Plan without opening a second Checkout Session or collecting a payment method.

## Team downgrade and data deletion

Selecting Free from an organizational workspace retains the existing confirmation modal. It clearly states that conversations, contacts, agent threads, agents, workflows, knowledge, files, analytics, settings, memberships, and connected channels will be permanently removed.

After confirmation:

1. Update the existing Stripe subscription to the selected Free price.
2. Register the active Free subscription against the owner’s personal billing identity.
3. Invoke the existing idempotent team-deletion workflow for the organizational workspace.
4. Reset plan credits to the Free allocation while preserving purchased and referral credits.
5. Redirect the user to the personal workspace.

The subscription update and deletion workflow must be retry-safe. A failed Stripe update does not delete the workspace. Once Stripe succeeds, retries converge without creating another subscription or duplicating deletion work.

Personal-workspace downgrades update the subscription and Free credit allocation but do not delete personal workspace data.

## User experience

- Onboarding and Pricing: selecting Free opens hosted Checkout with no card form when nothing is due.
- Settings → Plan, personal workspace: selecting Free updates the current subscription directly.
- Settings → Plan, team workspace: selecting Free shows the destructive warning, then updates and deletes the team after confirmation.
- Monthly and annual Free selections use the currently selected billing interval.
- Errors remain inside the plan dialog as actionable toast feedback rather than route-level application errors.

## Superseded demo behavior

- Remove inline `price_data` for Free.
- Remove the dedicated assumption that Settings Free creates a second subscription.
- Restore the team downgrade warning.
- Do not use unsupported `subscription_data[subscription_id]`.

## Verification

Verification covers:

- both Free environment values and price resolution;
- Free Checkout request parameters and selected interval;
- no-card collection settings;
- current subscription item replacement without adding a second item;
- Stripe failure before deletion;
- idempotent team deletion after a successful update;
- personal downgrade without personal data deletion;
- Free credit allocation and preservation of purchased/referral credits;
- configured-development Convex environment values and upload.

Production Stripe and production Convex remain out of scope.
