# Ilmu Mini Default Agent Model Design

## Goal

New agents default to Ilmu Mini V3.3 while retaining the existing model picker and explicit model selection.

## Current behavior

Agent creation has two separate defaults:

- The Create Agent page prefers DeepSeek V4 Flash when the model catalog loads.
- The `agents.create` mutation falls back to DeepSeek V4 Flash when no model is supplied.

These defaults can drift and make the backend fallback unavailable to Free-plan customers.

## Design

Export one `DEFAULT_AGENT_MODEL` identifier from the model catalog with the value `ilmu-mini-v3.3`.

The Create Agent page uses that identifier to preselect Ilmu Mini V3.3 when it is present in the enabled catalog. If it is unexpectedly absent, the existing first-enabled-model behavior remains so the form can still present a valid selection.

The `agents.create` mutation uses the same identifier when the caller omits or submits an empty model. Existing enabled-model and plan-access validation continues to run before persistence. The selected model's catalog metadata continues to determine the persisted provider, so a defaulted agent stores provider `ilmu`.

Explicit user selections remain unchanged.

## Testing

Add focused regression coverage that proves:

- The shared default agent model is `ilmu-mini-v3.3`.
- The Create Agent page resolves its preferred selection from the shared default rather than a local DeepSeek literal.
- `agents.create` without a model persists `ilmu-mini-v3.3` and provider `ilmu`.

Run the focused tests under Node 22 and verify the final diff for whitespace errors.

## Release handling

This is a customer-facing default change but is not confirmed deployed. Record it in `CONTINUITY.md`; add it to the public changelog only when its production availability date is confirmed.
