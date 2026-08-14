# Snapshot

- 2026-08-13 [USER] Manual Create booking/New booking must work whenever an agent has active services; Book appointment workflow configuration is unrelated.
- 2026-08-13 [CODE] Branch `codex/fix-booking-active-services` separates staff manual-booking service eligibility from AI workflow eligibility. Inbox and Calendar option queries now return every active, unarchived service; AI booking sessions remain workflow-filtered.
- 2026-08-13 [TOOL] Regression tests were RED with empty service arrays in both manual flows, then GREEN: 4/4 focused tests, Node v22.22.0 `tsc --noEmit`, and `git diff --check` pass. The full Vitest command has 1,345 passing tests but exits non-zero on 10 established Docs runner/configuration suites outside this change.
- 2026-08-13 [TOOL] Commit `6affb7ac` is pushed to `origin/codex/fix-booking-active-services`; `git merge-tree --write-tree origin/main HEAD` completed without conflicts. GitHub PR creation is blocked by connector 403 `Resource not accessible by integration`, while local `gh` has an invalid token. Production availability is UNCONFIRMED; no changelog entry is due before release.
- 2026-08-13 [USER] A selected current day must keep only its circular selection indicator, without the square muted calendar background.
- 2026-08-13 [USER] The selected Calendar View filter needs fully rounded pill corners.
- 2026-08-14 [USER] AI Lead Temperature must be a standalone pricing feature placed directly above Advanced Analytics, with hover copy that explains the capability.
- 2026-08-14 [USER] Every compact pricing card, including public pricing, onboarding, and upgrades, must show AI Lead Temperature as a separate eligible-plan feature.
- 2026-08-14 [USER] Compact cards should call out AI Lead Temperature only on Growth; Business inherits it without repetition, while Starter's one-time sync remains accurate in the detailed comparison.

# Done (recent)

- 2026-08-12 [CODE] Model catalogue refresh and announcement UI are implemented on `codex/model-catalog-refresh`; release/migration availability is UNCONFIRMED.
- 2026-08-11 [CODE] Landing WhatsApp live-demo and Amazon-model removal were completed on their respective branches; GitHub PR creation remains credential-blocked.

# Decisions

- 2026-08-13 D001 ACTIVE [USER] AI workflow service selections constrain AI booking only. Staff manual bookings use the active service catalogue.
- 2026-08-13 D002 ACTIVE [USER] Inbox Create booking and Calendar + New Booking default to the first valid 30-minute slot at or after the current time; there is no lead-time delay and temporal proximity overrides preferred times.
- 2026-08-14 D003 ACTIVE [USER] AI Lead Temperature remains enabled from Starter upward, while Advanced Analytics remains Growth-and-up and lists only topic detection and customer sentiment.
- 2026-08-14 D004 SUPERSEDED [USER] Compact pricing cards previously derived AI Lead Temperature from the existing lead-tagging entitlement.
- 2026-08-14 D005 SUPERSEDED [USER] Compact-card hover copy previously differentiated Starter, Growth, and Business.
- 2026-08-14 D006 ACTIVE [USER] Only the Growth compact card lists AI Lead Temperature, immediately before Advanced Analytics; Business inherits it via its Growth-inclusive header and Starter's one-time sync stays in the detailed comparison.
- 2026-08-14 D007 ACTIVE [USER] The Growth card hover describes daily refreshes; generic comparison hover states Starter's one-time sync and Growth-and-higher daily refresh.

# State

- 2026-08-14 [CODE] Now: `codex/ai-lead-temperature` implements the Growth-only compact-card callout without changing Starter-and-up entitlement flags.
- 2026-08-14 [TOOL] Next: commit and push this PR #60 update; do not add a release changelog entry until production availability is confirmed.
- 2026-08-13 [USER] Open questions: none.

# Working set

- `shared/planCatalog.ts`
- `convex/analyticsInsights.test.ts`
- `src/components/pricing/PlanAutoLeadTaggingHoverHint.tsx`
- `src/components/pricing/PlanAutoLeadTaggingHoverHint.test.tsx`
- `src/components/pricing/pricingFeatureHover.tsx`
- `shared/planKeyFeatures.test.ts`
- `docs/superpowers/specs/2026-08-14-ai-lead-temperature-pricing-design.md`
- `docs/superpowers/plans/2026-08-14-ai-lead-temperature-pricing.md`
- `CONTINUITY.md`

# Receipts

- 2026-08-13 [TOOL] `bun install --frozen-lockfile` completed under Node v22.22.0 to restore the worktree test runtime.
- 2026-08-13 [TOOL] RED: `bunx vitest run convex/manualBookingAvailability.test.ts convex/calendarManualBooking.test.ts` failed 2/2 because workflow filtering returned `[]`.
- 2026-08-13 [TOOL] GREEN: `bunx vitest run convex/manualBookingAvailability.test.ts convex/calendarManualBooking.test.ts convex/workflowAppointmentServices.test.ts` passed 4/4.
- 2026-08-13 [TOOL] `bunx tsc --noEmit` and `git diff --check` passed.
- 2026-08-13 [TOOL] `bunx vitest run` passed 1,345 tests across 415 files; 10 Docs suites remain incompatible with the root Vitest runner because Node TAP files are treated as empty suites and Docusaurus test dependencies are unavailable.
- 2026-08-13 [TOOL] `git push -u origin codex/fix-booking-active-services` succeeded; GitHub connector PR create returned 403 and local `gh auth status` reports an invalid `Leykwan132` token.
- 2026-08-13 [TOOL] Created and checked out local branch `codex/fix-slot-availability-create`; preserved unrelated untracked `pricing-knowledge-base-updated.md`.
- 2026-08-13 [USER] Confirmed the nearest default starts immediately at the next valid 30-minute slot.
- 2026-08-13 [CODE] Approved scope is Inbox Create booking; Calendar New Booking remains unchanged because customer-specific availability is unavailable before the customer selection.
- 2026-08-13 [TOOL] `bunx convex codegen` completed under Node v22.22.0 and uploaded the generated functions to its configured Convex deployment; deployment environment and production availability are UNCONFIRMED.
- 2026-08-13 [TOOL] Focused booking regression suite passed 13/13 under Node v22.22.0; `bunx tsc --noEmit` and `git diff --check` passed.
- 2026-08-13 [TOOL] Full `bunx vitest run` passed 1,346 tests across 415 files but exited non-zero on the same 10 Docs runner/configuration suites treated as empty by Vitest; unrelated to this booking change.
- 2026-08-13 [USER] Screenshot confirmed the Calendar + New Booking flow was not included in the prior implementation; user authorized extending it.
- 2026-08-13 [TOOL] Calendar nearest-slot lookup, customer-selection recheck, focused booking tests (13/13), `bunx tsc --noEmit`, and `git diff --check` passed under Node v22.22.0.
- 2026-08-13 [TOOL] Calendar selected-today regression was RED before the styling change and GREEN afterward; `CalendarSidebar.test.tsx` (2/2), `tsc --noEmit`, and `git diff --check` passed under Node v22.22.0.
- 2026-08-13 [TOOL] Calendar View filter pill regression was RED before the local active-row override and GREEN afterward; `CalendarSidebar.test.tsx` (3/3), `tsc --noEmit`, and `git diff --check` passed under Node v22.22.0.
- 2026-08-13 [TOOL] Pushed `codex/fix-slot-availability-create` and opened ready-for-review PR #58; 16 focused tests and `tsc --noEmit` passed immediately before PR creation.
- 2026-08-14 [TOOL] RED: standalone-pricing and hover tests failed before implementation because Lead Temperature remained in Advanced Analytics and the standalone label had no hover.
- 2026-08-14 [TOOL] GREEN: focused pricing tests (5/5), `bunx tsc --noEmit`, and `git diff --check` pass under Node v22.22.0.
- 2026-08-14 [TOOL] Full `bunx vitest run` passed 1,348 tests across 416 files but exited non-zero on 10 established Docs runner/dependency suites and an unrelated time-sensitive Calendar fixture.
- 2026-08-14 [TOOL] Commit `538cd6c1` was pushed to `origin/codex/ai-lead-temperature`; CLI-created draft PR #60 is `https://github.com/Leykwan132/chat-saas/pull/60`.
- 2026-08-14 [TOOL] RED then GREEN: compact pricing-card test failed before catalog derivation and passes with 6 focused pricing tests under Node v22.22.0; TypeScript and diff checks pass.
- 2026-08-14 [TOOL] Full `bunx vitest run` now passes 1,349 tests across 417 files but exits non-zero on the same 10 Docs runner/dependency suites and unrelated Calendar time-sensitive fixture.
- 2026-08-14 [TOOL] Commit `87703a84` was pushed to `origin/codex/ai-lead-temperature`, updating draft PR #60 with the compact-card feature list.
- 2026-08-14 [TOOL] RED then GREEN: Starter and Growth hover-cadence tests failed before the plan-aware copy and pass with 7 focused pricing tests under Node v22.22.0; TypeScript and diff checks pass.
- 2026-08-14 [TOOL] Full `bunx vitest run` now passes 1,350 tests across 417 files but exits non-zero on the same 10 Docs runner/dependency suites and unrelated Calendar time-sensitive fixture.
- 2026-08-14 [TOOL] Commit `c5e627a5` was pushed to `origin/codex/ai-lead-temperature`, updating draft PR #60 with plan-specific Lead Temperature cadence copy.
- 2026-08-14 [TOOL] RED: Growth-only compact-card and generic-hover regressions failed because Starter was listed and the generic copy named Business.
- 2026-08-14 [TOOL] GREEN: 7 focused pricing tests, `bunx tsc --noEmit`, and `git diff --check` pass under Node v22.22.0.
- 2026-08-14 [TOOL] Full `bunx vitest run` has 1,350 passing tests across 417 files but exits non-zero on 10 established Docs runner/dependency suites and an unrelated time-sensitive Calendar fixture.
