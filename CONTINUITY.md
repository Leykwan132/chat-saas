# Snapshot

- 2026-08-13 [USER] Manual Create booking/New booking must work whenever an agent has active services; Book appointment workflow configuration is unrelated.
- 2026-08-13 [CODE] Branch `codex/fix-booking-active-services` separates staff manual-booking service eligibility from AI workflow eligibility. Inbox and Calendar option queries now return every active, unarchived service; AI booking sessions remain workflow-filtered.
- 2026-08-13 [TOOL] Regression tests were RED with empty service arrays in both manual flows, then GREEN: 4/4 focused tests, Node v22.22.0 `tsc --noEmit`, and `git diff --check` pass. The full Vitest command has 1,345 passing tests but exits non-zero on 10 established Docs runner/configuration suites outside this change.
- 2026-08-13 [TOOL] Commit `6affb7ac` is pushed to `origin/codex/fix-booking-active-services`; `git merge-tree --write-tree origin/main HEAD` completed without conflicts. GitHub PR creation is blocked by connector 403 `Resource not accessible by integration`, while local `gh` has an invalid token. Production availability is UNCONFIRMED; no changelog entry is due before release.
- 2026-08-13 [USER] A selected current day must keep only its circular selection indicator, without the square muted calendar background.
- 2026-08-13 [USER] The selected Calendar View filter needs fully rounded pill corners.

# Done (recent)

- 2026-08-12 [CODE] Model catalogue refresh and announcement UI are implemented on `codex/model-catalog-refresh`; release/migration availability is UNCONFIRMED.
- 2026-08-11 [CODE] Landing WhatsApp live-demo and Amazon-model removal were completed on their respective branches; GitHub PR creation remains credential-blocked.

# Decisions

- 2026-08-13 D001 ACTIVE [USER] AI workflow service selections constrain AI booking only. Staff manual bookings use the active service catalogue.
- 2026-08-13 D002 ACTIVE [USER] Inbox Create booking and Calendar + New Booking default to the first valid 30-minute slot at or after the current time; there is no lead-time delay and temporal proximity overrides preferred times.

# State

- 2026-08-13 [CODE] Now: `codex/fix-slot-availability-create` renders active Calendar View filters as fully rounded pills and selected current calendar days without a square background.
- 2026-08-13 [TOOL] Next: hand off the verified branch; production availability is UNCONFIRMED.
- 2026-08-13 [USER] Open questions: none.

# Working set

- `convex/appointmentBooking/access.ts`
- `convex/appointmentBooking/manualBooking.ts`
- `convex/appointmentBooking/calendarManualBooking.ts`
- `convex/manualBookingAvailability.test.ts`
- `convex/calendarManualBooking.test.ts`
- `src/components/booking/useCreateBookingController.ts`
- `src/components/inbox/CreateCustomerBookingDialog.tsx`
- `src/components/inbox/manualBookingScheduleModel.ts`
- `src/components/ui/calendar.tsx`
- `src/components/ui/calendar.test.tsx`
- `src/components/calendar/CalendarSidebar.tsx`
- `src/components/calendar/CalendarSidebar.test.tsx`

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
