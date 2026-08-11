# Remove Amazon Model Support Design

## Goal

Remove Amazon Nova Micro from every supported-model surface on the current landing live-demo branch.

## Scope

- Remove `amazon/nova-micro-v1` from paid-plan model entitlements and display names.
- Remove its enabled Convex model-pricing entry so runtime model resolution rejects it as unavailable.
- Remove the Amazon Bedrock provider autocomplete literal from the shared model selector type.
- Remove Amazon Nova Micro from the Agent Setup supported-model documentation.
- Replace test fixtures that used Amazon Nova Micro for unrelated generic behavior.

## Compatibility

No migration or legacy execution path is required because the user confirmed no existing agent uses this model. A request that supplies `amazon/nova-micro-v1` after this change receives the existing unavailable-model behavior.

## Verification

A focused pricing regression will prove that the model is unavailable and absent from plan entitlements. Existing pricing, model-cost, and Docs guide tests will cover the updated fixtures and supported-model list. Scoped lint, the production build, and whitespace validation will complete the local review gate.

## Release

This change remains unreleased until the branch is merged and production availability is confirmed, so it belongs in `CONTINUITY.md` rather than the production changelog.
