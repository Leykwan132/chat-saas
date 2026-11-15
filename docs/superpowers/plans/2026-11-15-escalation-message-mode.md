# Escalation Message Mode Plan

**Spec:** docs/superpowers/specs/2026-11-15-escalation-message-mode-design.md

- [x] Add failing tests for mode validation/manual preservation and message delivery/generation ordering, failures and disabled settings.
- [x] Add optional node mode, extend settings/readiness, current-policy lookup and bounded generation inputs; implement AI-written generation using existing model/usage/credits helpers.
- [x] Wire keyword and tool handoffs through current server policy, delivery-before-escalation, and usage metadata. Preserve manual compatibility.
- [x] Use one optional custom-message switch (on: exact manual message; off: AI-written reply) and align right-column section/fields with the left column.
- [x] Run affected suites, backend/frontend type checks and build; review, refresh development, verify local UI and update ledger. No production release.

2026-11-15 [TOOL] Complete locally/development: 66 focused suites / 236 tests, backend TypeScript, app build, changed-module lint and diff checks passed. Review clean after real-shape credit-result regression fix. Browser verified message mode options and matching AI Replies column. Production unchanged.

2026-11-15 [USER] Latest switch wording supersedes the prior AI/manual button UI. [TOOL] Verified 17 focused suites / 68 tests plus lint/diff checks, development refresh and browser preview. Compact, consistent label/description spacing retained.
