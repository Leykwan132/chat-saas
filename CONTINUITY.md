# Snapshot

- 2026-08-13 [USER] Manual Create booking/New booking must work whenever an agent has active services; Book appointment workflow configuration is unrelated.
- 2026-08-13 [CODE] Branch `codex/fix-booking-active-services` separates staff manual-booking service eligibility from AI workflow eligibility. Inbox and Calendar option queries now return every active, unarchived service; AI booking sessions remain workflow-filtered.
- 2026-08-13 [TOOL] Regression tests were RED with empty service arrays in both manual flows, then GREEN: 4/4 focused tests, Node v22.22.0 `tsc --noEmit`, and `git diff --check` pass. The full Vitest command has 1,345 passing tests but exits non-zero on 10 established Docs runner/configuration suites outside this change.
- 2026-08-13 [TOOL] Commit `6affb7ac` is pushed to `origin/codex/fix-booking-active-services`; `git merge-tree --write-tree origin/main HEAD` completed without conflicts. GitHub PR creation is blocked by connector 403 `Resource not accessible by integration`, while local `gh` has an invalid token. Production availability is UNCONFIRMED; no changelog entry is due before release.

# Done (recent)

- 2026-08-12 [CODE] Model catalogue refresh and announcement UI are implemented on `codex/model-catalog-refresh`; release/migration availability is UNCONFIRMED.
- 2026-08-11 [CODE] Landing WhatsApp live-demo and Amazon-model removal were completed on their respective branches; GitHub PR creation remains credential-blocked.

# Decisions

- 2026-08-13 D001 ACTIVE [USER] AI workflow service selections constrain AI booking only. Staff manual bookings use the active service catalogue.

# State

- 2026-08-13 [TOOL] Now: final branch handoff for the manual-booking eligibility fix.
- 2026-08-13 [TOOL] Next: review, commit, and release the branch when authorized.
- 2026-08-13 [USER] Open questions: none.

# Working set

- `convex/appointmentBooking/access.ts`
- `convex/appointmentBooking/manualBooking.ts`
- `convex/appointmentBooking/calendarManualBooking.ts`
- `convex/manualBookingAvailability.test.ts`
- `convex/calendarManualBooking.test.ts`
- `docs/superpowers/specs/2026-08-13-manual-booking-service-eligibility-design.md`
- `docs/superpowers/plans/2026-08-13-manual-booking-service-eligibility.md`

# Receipts

- 2026-08-13 [TOOL] `bun install --frozen-lockfile` completed under Node v22.22.0 to restore the worktree test runtime.
- 2026-08-13 [TOOL] RED: `bunx vitest run convex/manualBookingAvailability.test.ts convex/calendarManualBooking.test.ts` failed 2/2 because workflow filtering returned `[]`.
- 2026-08-13 [TOOL] GREEN: `bunx vitest run convex/manualBookingAvailability.test.ts convex/calendarManualBooking.test.ts convex/workflowAppointmentServices.test.ts` passed 4/4.
- 2026-08-13 [TOOL] `bunx tsc --noEmit` and `git diff --check` passed.
- 2026-08-13 [TOOL] `bunx vitest run` passed 1,345 tests across 415 files; 10 Docs suites remain incompatible with the root Vitest runner because Node TAP files are treated as empty suites and Docusaurus test dependencies are unavailable.
- 2026-08-13 [TOOL] `git push -u origin codex/fix-booking-active-services` succeeded; GitHub connector PR create returned 403 and local `gh auth status` reports an invalid `Leykwan132` token.
