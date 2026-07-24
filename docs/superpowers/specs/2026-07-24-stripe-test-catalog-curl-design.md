# Stripe Test Catalog Curl Design

## Goal

Prepare a copyable sequence of Stripe API `curl` calls that creates the current KiloBot self-serve catalog in a fresh Stripe test environment and makes every generated price ID easy to map into the existing Convex environment variables.

## Scope

The command set creates six Stripe products and nine MYR prices:

| Product | Price type | Amount |
| --- | --- | ---: |
| KiloBot Starter | Monthly recurring | RM 149 |
| KiloBot Starter | Annual recurring | RM 1,490 |
| KiloBot Growth | Monthly recurring | RM 399 |
| KiloBot Growth | Annual recurring | RM 3,990 |
| KiloBot Business | Monthly recurring | RM 899 |
| KiloBot Business | Annual recurring | RM 8,990 |
| KiloBot Extra Credits — 2,000 | One-time | RM 49 |
| KiloBot Extra Credits — 5,000 | One-time | RM 99 |
| KiloBot Extra Credits — 15,000 | One-time | RM 249 |

The Free and Enterprise plans do not receive Stripe prices. Free requires no payment, and Enterprise remains a contact-sales offering.

## Product Structure

Starter, Growth, and Business each use one product with two attached prices. Monthly prices recur every month and annual prices recur every year.

Each extra-credit pack uses its own product and one one-time price. This makes the selected credit quantity visible by name in Stripe Checkout, receipts, and the Dashboard.

Products use stable custom IDs:

- `prod_kilobot_starter`
- `prod_kilobot_growth`
- `prod_kilobot_business`
- `prod_kilobot_credits_2000`
- `prod_kilobot_credits_5000`
- `prod_kilobot_credits_15000`

Prices use stable lookup keys:

- `kilobot_starter_monthly`
- `kilobot_starter_annual`
- `kilobot_growth_monthly`
- `kilobot_growth_annual`
- `kilobot_business_monthly`
- `kilobot_business_annual`
- `kilobot_credits_2000`
- `kilobot_credits_5000`
- `kilobot_credits_15000`

The commands attach catalog, plan, interval, pack, and credit metadata where applicable. Runtime billing continues to use Stripe price IDs, so lookup keys and metadata are operational labels rather than application dependencies.

## Authentication and Safety

The user exports `STRIPE_SECRET_KEY` in the current shell. The command sequence checks that the value starts with `sk_test_` before any write and makes a read-only Stripe balance request to verify authentication.

Every Stripe request authenticates with HTTP Basic Auth using `-u "$STRIPE_SECRET_KEY:"`. The key is never embedded in source files, committed, printed by the commands, or pasted into chat.

The calls target only Stripe test data. No Convex deployment or environment is changed by the catalog-creation calls.

## Command Flow

1. Export and validate the test secret key.
2. Verify Stripe authentication with a read-only request.
3. Create the six products with stable IDs and descriptive metadata.
4. Create the nine prices in MYR using integer minor-unit amounts.
5. Query the nine lookup keys and display their generated price IDs.
6. Print the exact mapping for:
   - `STRIPE_PRICE_STARTER_MONTHLY`
   - `STRIPE_PRICE_STARTER_ANNUAL`
   - `STRIPE_PRICE_GROWTH_MONTHLY`
   - `STRIPE_PRICE_GROWTH_ANNUAL`
   - `STRIPE_PRICE_BUSINESS_MONTHLY`
   - `STRIPE_PRICE_BUSINESS_ANNUAL`
   - `STRIPE_PRICE_EXTRA_CREDITS_2000`
   - `STRIPE_PRICE_EXTRA_CREDITS_5000`
   - `STRIPE_PRICE_EXTRA_CREDITS_15000`

The command set remains plain shell plus `curl`. Result extraction may use `jq` when available, but the Stripe JSON responses remain sufficient to copy IDs manually.

## Failure Behavior

The shell validation stops immediately for a missing or non-test key. Stripe HTTP errors are surfaced directly.

Stable product IDs and unique price lookup keys make accidental reruns fail visibly instead of silently creating a second catalog. The command set does not archive, replace, or delete existing Stripe resources.

If a partial run succeeds, the user resumes only from the first failed call after confirming which products and prices already exist in test mode.

## Verification

The final read-only price query must return exactly nine active prices with:

- `currency` equal to `myr`;
- the expected minor-unit amounts;
- recurring intervals of `month` or `year` for plan prices;
- one-time pricing for credit packs;
- the expected product IDs and lookup keys; and
- `livemode` equal to `false`.

The generated mapping must cover every Stripe price environment variable required by `convex/planStripe.ts`.

## Non-Goals

- Executing the Stripe writes on the user’s behalf.
- Storing or rotating Stripe secrets.
- Setting Convex environment variables.
- Creating webhook endpoints or signing secrets.
- Creating coupons, promotion codes, tax settings, payment links, or Customer Portal configuration.
- Changing application pricing or billing code.
- Creating live-mode Stripe resources.
