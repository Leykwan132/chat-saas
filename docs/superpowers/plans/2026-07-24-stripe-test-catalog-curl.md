# Stripe Test Catalog Curl Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a copyable, test-only Stripe `curl` runbook for the six approved KiloBot products and nine current MYR prices.

**Architecture:** A single Markdown runbook contains a key safety check, one authentication probe, explicit product and price creation requests, and one read-only verification query. Stable product IDs and price lookup keys prevent an accidental rerun from silently producing a parallel catalog.

**Tech Stack:** Stripe REST API, `curl`, POSIX-compatible shell environment variables, optional `jq`, Convex environment-variable names.

## Global Constraints

- Accept only a locally exported `STRIPE_SECRET_KEY` whose value starts with `sk_test_`.
- Never print, store, commit, or request the secret key.
- Create six products and nine MYR prices; do not create Free or Enterprise prices.
- Use one product per paid plan, with monthly and annual recurring prices attached to it.
- Use one separately named product per one-time credit pack.
- Do not execute Stripe writes or change Convex environment variables during implementation.
- Do not create webhooks, coupons, promotion codes, tax settings, payment links, or Customer Portal configuration.
- Do not change application pricing or billing code.

---

### Task 1: Write and verify the Stripe test-catalog runbook

**Files:**
- Create: `docs/stripe-test-catalog-curl.md`
- Reference: `docs/superpowers/specs/2026-07-24-stripe-test-catalog-curl-design.md`
- Reference: `shared/planCatalog.ts`
- Reference: `shared/extraCreditsCatalog.ts`
- Reference: `convex/planStripe.ts`

**Interfaces:**
- Consumes: `STRIPE_SECRET_KEY` from the user’s current shell.
- Produces: six Stripe product IDs, nine Stripe price lookup keys, and an output mapping from all nine required Convex variable names to generated `price_...` IDs.

- [ ] **Step 1: Create the runbook introduction and test-key guard**

Create `docs/stripe-test-catalog-curl.md` with a warning that the commands create Stripe test resources and must not receive a live key. Start its command sequence with:

```bash
export STRIPE_SECRET_KEY='sk_test_replace_me'

test -n "${STRIPE_SECRET_KEY:-}" &&
  test "${STRIPE_SECRET_KEY#sk_test_}" != "$STRIPE_SECRET_KEY" &&
  curl --fail-with-body --silent --show-error \
    https://api.stripe.com/v1/balance \
    -u "$STRIPE_SECRET_KEY:" |
  jq '{livemode, available, pending}'
```

State that the user must stop unless the response contains `"livemode": false`. State that `jq` is used only to format and validate responses; without it, the raw Stripe JSON still contains every ID.

- [ ] **Step 2: Add the six product creation calls**

Add these calls as one copyable shell block:

```bash
curl --fail-with-body --silent --show-error \
  https://api.stripe.com/v1/products \
  -u "$STRIPE_SECRET_KEY:" \
  -d id=prod_kilobot_starter \
  --data-urlencode "name=KiloBot Starter" \
  -d "metadata[catalog_key]=starter" \
  -d "metadata[type]=subscription"

curl --fail-with-body --silent --show-error \
  https://api.stripe.com/v1/products \
  -u "$STRIPE_SECRET_KEY:" \
  -d id=prod_kilobot_growth \
  --data-urlencode "name=KiloBot Growth" \
  -d "metadata[catalog_key]=growth" \
  -d "metadata[type]=subscription"

curl --fail-with-body --silent --show-error \
  https://api.stripe.com/v1/products \
  -u "$STRIPE_SECRET_KEY:" \
  -d id=prod_kilobot_business \
  --data-urlencode "name=KiloBot Business" \
  -d "metadata[catalog_key]=business" \
  -d "metadata[type]=subscription"

curl --fail-with-body --silent --show-error \
  https://api.stripe.com/v1/products \
  -u "$STRIPE_SECRET_KEY:" \
  -d id=prod_kilobot_credits_2000 \
  --data-urlencode "name=KiloBot Extra Credits — 2,000" \
  -d "metadata[catalog_key]=credits_2000" \
  -d "metadata[type]=extra_credits" \
  -d "metadata[credits_amount]=2000"

curl --fail-with-body --silent --show-error \
  https://api.stripe.com/v1/products \
  -u "$STRIPE_SECRET_KEY:" \
  -d id=prod_kilobot_credits_5000 \
  --data-urlencode "name=KiloBot Extra Credits — 5,000" \
  -d "metadata[catalog_key]=credits_5000" \
  -d "metadata[type]=extra_credits" \
  -d "metadata[credits_amount]=5000"

curl --fail-with-body --silent --show-error \
  https://api.stripe.com/v1/products \
  -u "$STRIPE_SECRET_KEY:" \
  -d id=prod_kilobot_credits_15000 \
  --data-urlencode "name=KiloBot Extra Credits — 15,000" \
  -d "metadata[catalog_key]=credits_15000" \
  -d "metadata[type]=extra_credits" \
  -d "metadata[credits_amount]=15000"
```

- [ ] **Step 3: Add the six recurring price creation calls**

Add these calls as the next shell block:

```bash
curl --fail-with-body --silent --show-error \
  https://api.stripe.com/v1/prices \
  -u "$STRIPE_SECRET_KEY:" \
  -d currency=myr \
  -d unit_amount=14900 \
  -d product=prod_kilobot_starter \
  -d "recurring[interval]=month" \
  -d lookup_key=kilobot_starter_monthly \
  --data-urlencode "nickname=Starter monthly" \
  -d "metadata[catalog_key]=starter" \
  -d "metadata[interval]=monthly"

curl --fail-with-body --silent --show-error \
  https://api.stripe.com/v1/prices \
  -u "$STRIPE_SECRET_KEY:" \
  -d currency=myr \
  -d unit_amount=149000 \
  -d product=prod_kilobot_starter \
  -d "recurring[interval]=year" \
  -d lookup_key=kilobot_starter_annual \
  --data-urlencode "nickname=Starter annual" \
  -d "metadata[catalog_key]=starter" \
  -d "metadata[interval]=annual"

curl --fail-with-body --silent --show-error \
  https://api.stripe.com/v1/prices \
  -u "$STRIPE_SECRET_KEY:" \
  -d currency=myr \
  -d unit_amount=39900 \
  -d product=prod_kilobot_growth \
  -d "recurring[interval]=month" \
  -d lookup_key=kilobot_growth_monthly \
  --data-urlencode "nickname=Growth monthly" \
  -d "metadata[catalog_key]=growth" \
  -d "metadata[interval]=monthly"

curl --fail-with-body --silent --show-error \
  https://api.stripe.com/v1/prices \
  -u "$STRIPE_SECRET_KEY:" \
  -d currency=myr \
  -d unit_amount=399000 \
  -d product=prod_kilobot_growth \
  -d "recurring[interval]=year" \
  -d lookup_key=kilobot_growth_annual \
  --data-urlencode "nickname=Growth annual" \
  -d "metadata[catalog_key]=growth" \
  -d "metadata[interval]=annual"

curl --fail-with-body --silent --show-error \
  https://api.stripe.com/v1/prices \
  -u "$STRIPE_SECRET_KEY:" \
  -d currency=myr \
  -d unit_amount=89900 \
  -d product=prod_kilobot_business \
  -d "recurring[interval]=month" \
  -d lookup_key=kilobot_business_monthly \
  --data-urlencode "nickname=Business monthly" \
  -d "metadata[catalog_key]=business" \
  -d "metadata[interval]=monthly"

curl --fail-with-body --silent --show-error \
  https://api.stripe.com/v1/prices \
  -u "$STRIPE_SECRET_KEY:" \
  -d currency=myr \
  -d unit_amount=899000 \
  -d product=prod_kilobot_business \
  -d "recurring[interval]=year" \
  -d lookup_key=kilobot_business_annual \
  --data-urlencode "nickname=Business annual" \
  -d "metadata[catalog_key]=business" \
  -d "metadata[interval]=annual"
```

- [ ] **Step 4: Add the three one-time credit price creation calls**

Add these calls as the next shell block:

```bash
curl --fail-with-body --silent --show-error \
  https://api.stripe.com/v1/prices \
  -u "$STRIPE_SECRET_KEY:" \
  -d currency=myr \
  -d unit_amount=4900 \
  -d product=prod_kilobot_credits_2000 \
  -d lookup_key=kilobot_credits_2000 \
  --data-urlencode "nickname=2,000 extra credits" \
  -d "metadata[catalog_key]=credits_2000" \
  -d "metadata[type]=extra_credits" \
  -d "metadata[credits_amount]=2000"

curl --fail-with-body --silent --show-error \
  https://api.stripe.com/v1/prices \
  -u "$STRIPE_SECRET_KEY:" \
  -d currency=myr \
  -d unit_amount=9900 \
  -d product=prod_kilobot_credits_5000 \
  -d lookup_key=kilobot_credits_5000 \
  --data-urlencode "nickname=5,000 extra credits" \
  -d "metadata[catalog_key]=credits_5000" \
  -d "metadata[type]=extra_credits" \
  -d "metadata[credits_amount]=5000"

curl --fail-with-body --silent --show-error \
  https://api.stripe.com/v1/prices \
  -u "$STRIPE_SECRET_KEY:" \
  -d currency=myr \
  -d unit_amount=24900 \
  -d product=prod_kilobot_credits_15000 \
  -d lookup_key=kilobot_credits_15000 \
  --data-urlencode "nickname=15,000 extra credits" \
  -d "metadata[catalog_key]=credits_15000" \
  -d "metadata[type]=extra_credits" \
  -d "metadata[credits_amount]=15000"
```

- [ ] **Step 5: Add the final verification and Convex mapping call**

Add this read-only call and validator:

```bash
curl --fail-with-body --silent --show-error --get \
  https://api.stripe.com/v1/prices \
  -u "$STRIPE_SECRET_KEY:" \
  -d limit=100 \
  -d "lookup_keys[]=kilobot_starter_monthly" \
  -d "lookup_keys[]=kilobot_starter_annual" \
  -d "lookup_keys[]=kilobot_growth_monthly" \
  -d "lookup_keys[]=kilobot_growth_annual" \
  -d "lookup_keys[]=kilobot_business_monthly" \
  -d "lookup_keys[]=kilobot_business_annual" \
  -d "lookup_keys[]=kilobot_credits_2000" \
  -d "lookup_keys[]=kilobot_credits_5000" \
  -d "lookup_keys[]=kilobot_credits_15000" |
jq -r '
  . as $response
  | {
      "kilobot_starter_monthly": {
        env: "STRIPE_PRICE_STARTER_MONTHLY",
        amount: 14900,
        product: "prod_kilobot_starter",
        interval: "month"
      },
      "kilobot_starter_annual": {
        env: "STRIPE_PRICE_STARTER_ANNUAL",
        amount: 149000,
        product: "prod_kilobot_starter",
        interval: "year"
      },
      "kilobot_growth_monthly": {
        env: "STRIPE_PRICE_GROWTH_MONTHLY",
        amount: 39900,
        product: "prod_kilobot_growth",
        interval: "month"
      },
      "kilobot_growth_annual": {
        env: "STRIPE_PRICE_GROWTH_ANNUAL",
        amount: 399000,
        product: "prod_kilobot_growth",
        interval: "year"
      },
      "kilobot_business_monthly": {
        env: "STRIPE_PRICE_BUSINESS_MONTHLY",
        amount: 89900,
        product: "prod_kilobot_business",
        interval: "month"
      },
      "kilobot_business_annual": {
        env: "STRIPE_PRICE_BUSINESS_ANNUAL",
        amount: 899000,
        product: "prod_kilobot_business",
        interval: "year"
      },
      "kilobot_credits_2000": {
        env: "STRIPE_PRICE_EXTRA_CREDITS_2000",
        amount: 4900,
        product: "prod_kilobot_credits_2000",
        interval: null
      },
      "kilobot_credits_5000": {
        env: "STRIPE_PRICE_EXTRA_CREDITS_5000",
        amount: 9900,
        product: "prod_kilobot_credits_5000",
        interval: null
      },
      "kilobot_credits_15000": {
        env: "STRIPE_PRICE_EXTRA_CREDITS_15000",
        amount: 24900,
        product: "prod_kilobot_credits_15000",
        interval: null
      }
    } as $expected
  | [
      $expected
      | to_entries[] as $entry
      | $response.data[]
      | select(.lookup_key == $entry.key)
      | select(.active == true)
      | select(.livemode == false)
      | select(.currency == "myr")
      | select(.unit_amount == $entry.value.amount)
      | select(.product == $entry.value.product)
      | select((.recurring.interval // null) == $entry.value.interval)
      | { env: $entry.value.env, id }
    ] as $verified
  | if ($verified | length) != 9
    then error("Stripe catalog verification failed")
    else $verified[] | "\(.env)=\(.id)"
    end
'
```

Explain that successful output contains exactly nine `STRIPE_PRICE_...=price_...` lines. Include a separate optional example for setting one value:

```bash
bunx convex env set STRIPE_PRICE_STARTER_MONTHLY price_replace_me
```

State that the user should repeat that command for the intended Convex deployment only after reviewing all nine mappings. Do not include an automated loop that mutates Convex.

- [ ] **Step 6: Verify the runbook’s static catalog contract**

Run:

```bash
rg -o 'id=prod_kilobot_[a-z0-9_]+' docs/stripe-test-catalog-curl.md | sort -u
rg -o 'lookup_key=kilobot_[a-z0-9_]+' docs/stripe-test-catalog-curl.md | sort -u
rg -o 'unit_amount=[0-9]+' docs/stripe-test-catalog-curl.md | sort -u
rg -o 'STRIPE_PRICE_[A-Z0-9_]+' docs/stripe-test-catalog-curl.md | sort -u
git diff --check
```

Expected:

- exactly six unique `prod_kilobot_...` IDs;
- exactly nine unique `kilobot_...` lookup keys;
- the nine unique amounts `4900`, `9900`, `14900`, `24900`, `39900`, `89900`, `149000`, `399000`, and `899000`;
- exactly the nine environment-variable names required by `convex/planStripe.ts`; and
- no whitespace errors.

- [ ] **Step 7: Update the continuity ledger**

Replace the current Stripe design line in `Snapshot` with:

```markdown
- 2026-07-24 [CODE] The Stripe test-catalog runbook provides guarded plain `curl` calls for six products and nine MYR prices, verifies every catalog field in test mode, and prints all required Convex price-ID mappings without mutating Stripe or Convex during repository implementation.
```

Update the Stripe entry in `Working set` to:

```markdown
- 2026-07-24 [CODE] Stripe test catalog: `docs/{stripe-test-catalog-curl.md,superpowers/specs/2026-07-24-stripe-test-catalog-curl-design.md,superpowers/plans/2026-07-24-stripe-test-catalog-curl.md}`.
```

Add this newest receipt while keeping the ledger’s bounded sections within their configured limits:

```markdown
- 2026-07-24 [TOOL] The Stripe test-catalog runbook passed static checks for six product IDs, nine price lookup keys, nine MYR amounts, all nine Convex variable names, test-key safety, read-only final verification, and whitespace; no Stripe or Convex write was executed.
```

- [ ] **Step 8: Commit the runbook**

```bash
git add docs/stripe-test-catalog-curl.md CONTINUITY.md
git commit -m "Document Stripe test catalog setup"
```
