# Ilmu Mini OpenAI-Compatible Model Design

## Context

Kilobot currently routes every selectable model through OpenRouter. The application uses AI SDK 6 and `@convex-dev/agent`, and the model catalog controls selection, plan access, credit charges, display metadata, and analytics labels.

Ilmu exposes `ilmu-mini-v3.3` through an OpenAI-compatible endpoint at `https://api.ilmu.ai/v1`. The model costs RM0.20 per million input tokens and RM1.20 per million output tokens. It must be available on the Free plan and use the user-supplied Ilmu image in the model picker.

Ilmu Mini V3.3 is the only Free-plan model. Every OpenRouter model, including Amazon Nova Micro and DeepSeek V4 Flash, requires Starter or higher.

## Goals

- Add `ilmu-mini-v3.3` as a fully usable model across agent creation, updates, playground responses, inbox replies, lead labeling, and thread summaries.
- Route Ilmu requests through the OpenAI-compatible provider without changing OpenRouter behavior for existing models.
- Make Ilmu Mini the only Free plan model.
- Keep every OpenRouter model on Starter, Growth, and Business, while retaining DeepSeek V4 Flash's Popular designation.
- Record Ilmu usage under the correct provider and calculate its token cost for admin reporting.
- Display the supplied Ilmu image reliably in every model-picker state.
- Fail clearly when Ilmu credentials are missing or the provider request fails.

## Non-goals

- Changing the product's one-credit-per-message charge.
- Repricing existing OpenRouter models.
- Adding provider failover.
- Upgrading the application from AI SDK 6.
- Building a generic plugin system for arbitrary model providers.

## Catalog and plan access

The model catalog will carry enough metadata to identify the inference provider and optional custom image. `ilmu-mini-v3.3` will use:

- Label: `Ilmu Mini V3.3`
- Provider: `ilmu`
- Chef: `YTL AI Labs`
- Required plan: `free`
- Labels: `basic` and `latest`
- Credit cost: `1`
- Image: `https://storage.kilobot.app/ytl_ai_labs-removebg-preview.png`

The Free plan model list will contain only `ilmu-mini-v3.3`. All paid plans will contain Ilmu Mini, Amazon Nova Micro, and the existing advanced catalog. Amazon Nova Micro uses required plan `starter` with an `advanced` label.

DeepSeek V4 Flash will change to required plan `starter` with `advanced` and `popular` labels. It will remain the only model with `isPopular: true`.

## Provider routing

A focused language-model resolver will replace direct OpenRouter construction wherever the selected agent model is used. The resolver will read provider metadata from the enabled catalog and return both the AI SDK language model and the stable provider identifier.

For OpenRouter entries, the resolver will continue using the existing OpenRouter client. For `ilmu`, it will create an OpenAI-compatible client with:

- Base URL: `https://api.ilmu.ai/v1`
- Name: `ilmu`
- API key: `process.env.ILMU_API_KEY`
- Chat model: `ilmu-mini-v3.3`

`@ai-sdk/openai-compatible` will be changed from `3.0.7` to the AI SDK 6-compatible `2.0.59` line. Version 3 returns the provider-v4 model interface and is incompatible with the application's AI SDK 6 provider-v3 consumers.

The resolver will be used by the main Convex Agent configuration and the direct `generateText` paths that use a conversation's selected model. Analytics jobs that intentionally use the fixed OpenRouter default model will remain unchanged.

## Persisted provider identity

The `agents.provider` schema will accept `ilmu`. Agent creation and model updates will derive the persisted provider from model metadata instead of always writing `openrouter`.

Playground message metadata, raw agent usage, and PostHog generation events will use the resolved or SDK-reported provider. The application will not relabel Ilmu generations as OpenRouter.

## Usage cost accounting

Ilmu pricing will be represented as MYR per million tokens:

- Input: RM0.20
- Output: RM1.20

The admin cost aggregate currently stores normalized USD values because OpenRouter reports USD. A pure cost resolver will preserve OpenRouter's provider-reported USD cost and calculate Ilmu cost from prompt and completion tokens. Ilmu MYR cost will be normalized to USD using the existing `1 USD = RM4.70` reporting rate before aggregation. The MYR admin view will therefore reproduce the configured Ilmu amount, while the USD view remains an estimate.

Unrecognized providers without provider-reported cost or configured token rates will remain uncosted rather than receiving a fabricated fallback.

## Model image

The catalog exposes `https://storage.kilobot.app/ytl_ai_labs-removebg-preview.png`, and every model-list surface consumes the optional custom image source. Existing provider logos continue using `models.dev`.

## Data flow

1. The frontend loads enabled model metadata from Convex.
2. The model picker renders the catalog label, access state, credit cost, and custom Ilmu image.
3. Agent create or update validates the model and plan entitlement, then persists its model and derived provider.
4. A chat path resolves the selected model into the correct AI SDK provider client.
5. Ilmu requests use the OpenAI-compatible endpoint and `ILMU_API_KEY`.
6. The generation usage handler stores model, provider, token usage, and provider metadata.
7. Admin cost aggregation uses provider-reported OpenRouter cost or configured Ilmu token rates.

## Error handling

- Missing `ILMU_API_KEY` throws `ILMU_API_KEY is not configured` before a request is attempted.
- Unknown or disabled model IDs remain rejected by existing model validation.
- Provider errors propagate to the existing chat failure path.
- Ilmu never falls back to OpenRouter or another model.
- The model image uses the user-provided stable Kilobot storage URL.

## Testing strategy

Implementation will follow red-green-refactor:

1. Extend catalog tests to require Ilmu metadata, exclusive Free access, paid access for every other model, and paid Amazon/DeepSeek entitlements.
2. Add pure provider-routing tests for OpenRouter, Ilmu, unknown models, and missing credentials.
3. Add cost tests for Ilmu input-only, output-only, combined usage, OpenRouter metadata precedence, and uncosted providers.
4. Add model-logo source tests for the custom Ilmu image and default provider logos.
5. Add agent provider derivation and schema coverage.
6. Run focused tests after each red-green cycle.
7. Run Convex code generation, the relevant combined test suite, targeted ESLint, full TypeScript/build verification, `git diff --check`, and touched-code line-count checks before completion.

## Deployment requirements

- Configure `ILMU_API_KEY` in every Convex deployment that can execute agent generations.
- Keep the existing `OPEN_ROUTER_API` configuration for OpenRouter models.
- No data migration is required because existing agent provider values remain valid and newly selected models update provider identity through normal mutations.
