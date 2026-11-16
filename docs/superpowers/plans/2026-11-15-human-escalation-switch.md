# Human Escalation Switch Implementation Plan

**Goal:** Put Human Escalation in an Instructions sub-tab with a persisted master switch and plain settings layout.
**Spec:** docs/superpowers/specs/2026-11-15-human-escalation-switch-design.md
**Architecture:** Optional workflow flag preserves old behavior; a small authenticated mutation initializes a rule on first enable. Runtime gates use the flag without deleting configuration. Existing Tabs/Field/Switch primitives provide the UI.

- [x] Write and run failing behavior tests for disabling/re-enabling, rule preservation and default initialization; cover keyword/runtime/final escalation gates and access.
- [x] Add workflow flag and setting mutation; use the flag in runtime context, keyword matching and final handoff availability.
- [x] Add General/Human Escalation line tabs; remove nested card, add master switch and hide details when off. Preserve existing General layout and playground.
- [x] Verify affected backend/UI suites, lint and build; review runtime and settings preservation.
- [x] Refresh development backend for local testing, verify local HTTP/app view, and update CONTINUITY.md. Unreleased; no changelog entry.

2026-11-15 [TOOL] Complete: 67 focused suites / 239 tests, build, backend TypeScript and changed-module lint passed. Review clean; development refreshed; local browser expansion/collapse verified. Production unchanged.
