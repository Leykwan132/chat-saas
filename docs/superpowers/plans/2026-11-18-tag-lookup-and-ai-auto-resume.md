# Tag lookup and separate AI auto resume implementation plan

**Goal:** Read tags directly and add independent normal-human-reply auto resume.

**Architecture:** Preserve escalation configuration/API and use an optional normal scope on shared timer/configuration helpers. Existing timers remain escalation timers; normal timers cannot own escalated conversations. Reuse the existing settings form with distinct copy and independent configuration.

**Tech Stack:** React, shadcn, Convex, convex-test, Vitest, Node v22.

**Spec:** `docs/superpowers/specs/2026-11-18-tag-lookup-and-ai-auto-resume-design.md`.

## Constraints and review focus

- Node v22 in each script/test execution; code modules under 300 lines; no unsolicited deployment.
- Preserve existing uncommitted widget/release/report work.
- Normal timer must be invalidated by escalation, reassignment, closure, manual resume and disabling/re-enabling.
- Sent Inbox replies and business echoes arm timers; queued, failed, automated, inbound and AI messages do not.
- Independent settings must retain existing escalation values and enforce agent access.

## Task 1: Normal-reply auto resume

- [x] Add failing integration tests for normal human replies, scope isolation, sent transitions, keyword completion and timer invalidation.
- [x] Add independent `agents.autoResume` configuration and optional normal scope to shared timer/configuration APIs, retaining legacy escalation behavior.
- [x] Extract timer ownership/configuration helpers to `convex/autoResumeTimerState.ts`; extend `convex/autoDeescalationRuntime.ts` and schema.
- [x] Verify normal and existing escalation suites plus settings authorization tests.

## Task 2: Settings and direct tag lookup

- [x] Add a failing UI test for independent Auto resume beneath AI reply audience; retain Human Escalation controls.
- [x] Reuse the form in `AutoDeescalationControl.tsx` with scope-specific labels and disabled permission state, integrate with `AgentSetupRoutingPanel.tsx` and `AgentSetupPanels.tsx`.
- [x] Verify existing local `WorkflowFollowupAudienceField.tsx` reads workspace tags without customer queries and preserves authenticated skip behavior.

## Task 3: Verification and continuity

- [x] Run focused tests, scoped lint/format, app/backend checks appropriate to this planned schema/runtime change, and diff review. Full suite: 2493 passed, one existing unrelated landing-widget test failed. Docs: 63 passed.
- [x] Review all changes against stale timers, independent scope/config and permissions. Independent reviewer found no actionable issues.
- [x] Record results in CONTINUITY.md; code remains unreleased until deployment availability is confirmed, so do not add a production changelog entry for local changes.
