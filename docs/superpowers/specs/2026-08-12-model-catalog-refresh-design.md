# Model Catalog Refresh Design

## Goal

Replace the retired Amazon Nova Micro and OpenAI GPT-OSS 120B options with OpenAI GPT-5.6 Luna and NVIDIA Nemotron 3.5 Lightning, then add Qwen3.7 Flash across the selectable model catalog and dashboard-supported LLM registry.

## Scope

- Remove `amazon/nova-micro-v1` and `openai/gpt-oss-120b` from paid-plan entitlements, display names, runtime pricing, and the Agent Setup supported-model guide.
- Add `openai/gpt-5.6-luna`, `nvidia/nemotron-3.5-lightning`, and `qwen/qwen3.7-flash` as enabled OpenRouter models for Starter, Growth, and Business.
- Mark all added models as Advanced and Latest, charge the established one credit per message, and group them under their respective providers in the model picker.
- Keep Ilmu Mini V3.3 as the only Free/default model and leave all other existing model entries unchanged.
- Preserve retired model names and providers in historical credit and leaderboard views without returning those records from the enabled-model registry.
- Replace retired model names in the landing preview, fake-usage display, and Starter upgrade copy.

## Compatibility

No migration is required. The user previously confirmed no agent uses Amazon Nova Micro, and removed catalog IDs follow the existing unavailable-model validation path. New models use the existing generic OpenRouter provider and logo path, so no selector type or UI component changes are necessary.

## Verification

Focused pricing tests will prove that both retired IDs are absent from dashboard availability and paid-plan entitlements, and that both replacement IDs are enabled with the required metadata and entitlement set. The Agent Setup guide test, scoped lint, production build, and whitespace check will validate the remaining surfaces.

## Release

This is a customer-facing catalog change but is not production-available until the PR is merged and deployed. Record it in `CONTINUITY.md`; do not update the production changelog yet.
