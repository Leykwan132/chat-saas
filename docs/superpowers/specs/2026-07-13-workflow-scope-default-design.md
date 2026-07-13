# Workflow Scope Default Design

## Goal

Select `Future only` by default in the `Apply to` field for both Reminders and Follow-up.

## Design

- Set `activationScope: 'futureOnly'` on both automation configurations returned by `createInitialWorkflowAutomationConfigs`.
- When resolving stored workflow automation configurations, merge each stored automation over its corresponding initialized configuration.
- Treat a missing stored `activationScope` as an older unset configuration and normalize it to `futureOnly` in the resolved configuration.
- Preserve every explicit stored choice, including `currentAndFuture`.
- Keep the activation-scope type optional for compatibility with existing stored documents that may omit it.

## Behavior

- New workflows show `Future only` selected for Reminders and Follow-up.
- Existing workflows with no stored scope show `Future only` selected for both automation cards.
- Existing workflows with an explicit scope continue showing that scope.
- `Future only` continues to skip the activation reconciliation scan; ongoing eligible events are unchanged.

## Scope

The change is limited to shared default configuration and Convex configuration resolution. It does not backfill or rewrite stored workflow documents, change validators, or change scheduling logic.

## Verification

- Add tests proving both initialized scopes are `futureOnly`.
- Add resolver tests proving missing stored scopes normalize to `futureOnly` and explicit `currentAndFuture` values remain unchanged.
- Run focused tests under Node 22, targeted lint, `git diff --check`, and touched-code line-count checks.
