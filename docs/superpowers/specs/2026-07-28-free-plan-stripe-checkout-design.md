# Free Plan Stripe Checkout Design

## Goal

Let a newly authenticated user select Free and experience Stripe-hosted Checkout without entering payment details. A successful Checkout creates an active RM0 subscription that the existing webhook pipeline recognizes as the Free plan.

## Scope

The first rollout is limited to the configured development Convex deployment and Stripe test mode.

Free Checkout applies to:

- Free selection during onboarding
- Free selection on Pricing for an authenticated user who has no active paid subscription

It does not replace the existing paid-plan downgrade flow. A user with an active paid subscription must manage or downgrade that subscription through workspace billing instead of creating a second Free subscription.

Production Stripe products, prices, environment values, and deployments remain untouched.

## Stripe Catalog

Provision one reusable Stripe test-mode catalog entry:

- Product: `Kilobot Free`
- Price currency: `myr`
- Unit amount: `0`
- Recurrence: monthly

Store the resulting price ID in the configured development Convex environment as `STRIPE_PRICE_FREE`.

The price is recurring because Checkout requires a recurring line item in subscription mode. The product remains Free forever; the monthly recurrence only advances Stripe subscription periods and does not control Kilobot's independent credit-reset schedule.

Price provisioning must be idempotent:

1. Reuse the configured `STRIPE_PRICE_FREE` when present and valid.
2. Otherwise reuse an exact matching active RM0 MYR monthly price for `Kilobot Free`.
3. Create the product or price only when no exact test-mode match exists.
4. Refuse to provision against a live-mode Stripe key.

## Checkout Contract

The existing `stripe.createCheckout` action accepts `plan: "free"` with `mode: "subscription"`.

For Free:

- Resolve `STRIPE_PRICE_FREE`.
- Set `payment_method_collection: "if_required"`.
- Do not enable promotion-code entry.
- Keep the authenticated Stripe Customer and its known email.
- Attach the same organization and subscription metadata used by paid Checkout.
- Use the existing success URL at `/workspace?success=true`.
- Preserve the caller-specific cancel URL.

For Starter, Growth, Business, and credit top-ups, Checkout parameters remain unchanged.

Because Checkout receives an existing Customer, Stripe can prefill or display the known email rather than asking the user to type it again. The defining acceptance condition is that no payment-method form is displayed for the RM0 session.

## Plan Resolution and Webhooks

`STRIPE_PRICE_FREE` is a first-class subscription price mapping.

The Stripe price resolver returns:

- Free price → `free`
- Starter prices → `starter`
- Growth prices → `growth`
- Business prices → `business`

The existing `customer.subscription.created` and `customer.subscription.updated` handlers continue to persist the subscription, customer, status, price, period end, and organization metadata.

An active or trialing subscription using `STRIPE_PRICE_FREE`:

- Resolves to Free without throwing an unsupported-price error.
- Leaves the current Free credit period at its configured 50-credit allocation.
- Does not grant paid-plan credits.
- Becomes the latest subscription ground truth through the existing creation-order resolver.

Repeated webhook delivery remains idempotent through the existing Stripe component subscription identity and credit-period reconciliation.

## Signup Entry Points

### Onboarding

Selecting Free completes onboarding data persistence, requests a Free Checkout Session, and navigates to the returned Stripe URL.

The current direct `createStripeCustomer` plus immediate workspace redirect is removed from this path.

### Pricing

For an authenticated user without an active paid subscription, selecting Free requests the same Free Checkout Session and navigates to Stripe.

For an authenticated paid user, selecting Free does not create a second subscription. The UI directs the user to workspace Plan settings, where the existing downgrade confirmation and cleanup behavior remains authoritative.

Unauthenticated Pricing selection still begins WorkOS signup. The user reaches Free Checkout after authentication through onboarding.

## Failure Handling

- A missing or invalid `STRIPE_PRICE_FREE` fails explicitly with a configuration error.
- A Checkout response without a URL shows the existing user-facing checkout error.
- Stripe API failures retain the user on the current application page and restore the selectable UI state.
- Canceling Checkout returns to onboarding or Pricing according to the initiating entrypoint.
- No fallback silently bypasses Checkout for Free.

## Verification

### Backend contracts

- Free subscription Checkout uses the configured RM0 price.
- Free subscription Checkout sets `payment_method_collection` to `if_required`.
- Free Checkout omits promotion codes.
- Paid subscription and top-up Checkout parameters are unchanged.
- The Free Stripe price resolves to the Free plan.
- An active Free subscription webhook does not grant paid credits.
- Paid users cannot start a second Free subscription from the signup flow.

### Frontend contracts

- Onboarding Free selection requests Checkout instead of calling `createStripeCustomer`.
- Eligible authenticated Pricing Free selection requests Checkout.
- Paid Pricing users are directed to workspace Plan settings.
- Loading and error states recover without duplicate requests.

### Live development check

Using Stripe test mode:

1. Sign in as a test user without an active paid subscription.
2. Select Free.
3. Confirm Stripe-hosted Checkout shows the RM0 plan and no payment form.
4. Complete Checkout.
5. Confirm redirect to `/workspace?success=true`.
6. Confirm the latest Stripe component subscription is active and maps to Free.
7. Confirm the current credit allocation remains `50 / 50`.

No production deployment or public changelog entry is part of this rollout.
