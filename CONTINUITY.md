# CONTINUITY.md

# Snapshot
- 2026-08-15 [USER] Goal: develop Google Calendar booking sync on `cursor/google-calendar-booking-sync-10b0` against the merged `origin/main` baseline.
- 2026-08-16 [CODE] Now: calendar booking availability is deployed with source indicators, Google Meet booking links, diagnostics, and personal-service assignment repair.
- 2026-08-16 [CODE] Now: manual and CSV customer creation persist the active agent scope; personal entries retain owner scope, and the safe legacy personal-customer backfill has completed.
- 2026-08-16 [TOOL] Now: PR #56 is current with the local branch and a full-change description.
- 2026-08-15 [USER] D656 ACTIVE: Calendar creation actions use the booking dialog and preserve the selected date.
- 2026-08-15 [USER] D657 ACTIVE: Google Calendar connection controls are PostHog early access for `leykwan132@gmail.com` and `kwanrealtyofficial@gmail.com`.
- 2026-08-15 [USER] D658 ACTIVE: connected-calendar manual events fail closed: a Google write failure prevents local retention.
- 2026-08-15 [USER] D659 ACTIVE: Google Meet bookings generate Google Meet links only through the assigned staff member’s connected calendar.
- 2026-08-15 [USER] D660 ACTIVE: Service location offers Video call, Google Meet, and In person; Google Meet is unavailable until the eligible user connects Google Calendar.
- 2026-08-15 [USER] D668 ACTIVE: standard Dialog and Sheet backdrops use the unblurred light overlay.
- 2026-08-16 [USER] D671 ACTIVE: calendar provenance communicates Google synchronization only, with one white check inside a solid green circle.
- 2026-08-16 [USER] D677 ACTIVE: Create Booking has an editable, prefilled Title that is used locally and in Google Calendar.
- 2026-08-16 [USER] D678 ACTIVE: Weekly availability accepts valid custom times outside the preset grid.
- 2026-08-16 [USER] D679 ACTIVE: Availability Save appears inside the content-sized card footer, without a separator.
- 2026-08-16 [USER] D689 ACTIVE: New Booking pre-fills the next 30-minute clock slot for its selected service without searching availability.
- 2026-08-16 [USER] D692 ACTIVE: availability checks begin with service, date, and time; customer selection triggers a routing-aware re-check.
- 2026-08-16 [USER] D693 ACTIVE: unavailable booking slots expose a same-row `Change availability` action.
- 2026-08-16 [USER] D694 ACTIVE: failed availability checks emit privacy-safe backend rejection diagnostics.
- 2026-08-16 [USER] D695 ACTIVE: personal services assign only their owner; legacy records are repaired by migration.
- 2026-08-16 [USER] D696 ACTIVE: only Google Meet (`locationMode: "remote"`) services require healthy Google Calendar synchronization; In person and legacy-location services do not reject availability for `google_calendar_unhealthy`.
- 2026-08-16 [USER] D697 ACTIVE: a successful Google Calendar sync remains healthy regardless of age; the daily maintenance job renews watches only and does not run stale-sync sweeps.
- 2026-08-16 [USER] D698 ACTIVE: manually created and CSV-imported customers are assigned to the active agent, with personal-workspace owner scope retained.
- 2026-08-16 [USER] D699 ACTIVE: Google Meet customer confirmations include the generated meeting link when the booking has one.
- 2026-08-16 [USER] D700 ACTIVE: Video call is a manual, non-Google service location; users create and share its meeting link themselves.
- 2026-08-16 [TOOL] Investigation: `service_not_assigned` compares service assignee WorkOS IDs with each roster schedule’s WorkOS ID. The inspected service was created after the personal-assignment migration and already belongs to the agent owner; its logged candidate is a distinct user’s schedule, so the migration is not the proven cause of that log.

# Decisions
- 2026-08-12 [USER] D637 ACTIVE: Google connections are individual; agent-created events use the assigned teammate’s primary calendar.
- 2026-08-12 [USER] D638 ACTIVE: Convex is the normalized read-through cache; synchronization is idempotent and refreshes at calendar, availability, and agent-operation boundaries.
- 2026-08-12 [USER] D639 ACTIVE: owners see external event details; teammates see Busy-only projections.
- 2026-08-13 [USER] D640 ACTIVE: customer-facing agent mutations are limited to confirmed Kilobot-created events in the active conversation.
- 2026-08-13 [USER] D641 ACTIVE: V1 is primary-calendar-only with Google push-assisted sync and fail-closed connected-calendar operations.
- 2026-08-13 [USER] D655 ACTIVE: staff manual bookings use every active, unarchived service; workflow service choices constrain AI booking only.
- 2026-08-14 [USER] D013 ACTIVE: booking availability requires service teammate assignment and calendar availability, while lead eligibility follows weekly hours and time off.

# Done (recent)
- 2026-08-15 [CODE] Milestone: Google Calendar connection, sync, fail-closed writes, Meet links, and `origin/main` merge landed on this branch.
- 2026-08-16 [CODE] Calendar booking UI, availability feedback, custom times, service dialogs, and Video call/Google Meet location behavior were implemented.
- 2026-08-16 [CODE] Google health now blocks only Meet availability; daily maintenance renews watches and no longer sweeps stale syncs.
- 2026-08-16 [CODE] Manual and CSV customers persist active-agent scope; personal workspace entries keep owner scope.
- 2026-08-16 [TOOL] Personal-service assignment repair (9 records) and safe personal-customer backfill (31 scanned) completed on the development deployment.
- 2026-08-16 [TOOL] Pushed 51 local commits to `cursor/google-calendar-booking-sync-10b0` and rewrote PR #56 to cover the full change set.
- 2026-08-16 [CODE] Remote booking confirmation and update messages now include the Google Meet link when available.
- 2026-08-16 [CODE] Booking create and edit flows share the availability time combobox, including typed custom times.

# Working set
- `convex/schema.ts`
- `convex/appointmentBooking/fields.ts`
- `convex/appointmentBooking/fields.test.ts`
- `convex/appointmentBooking/confirmations.ts`
- `convex/appointmentBooking/services.ts`
- `convex/appointmentBookingAvailability.test.ts`
- `src/lib/serviceForm.ts`
- `src/lib/serviceForm.test.ts`
- `src/components/services/ServiceLocationField.tsx`
- `src/components/services/serviceFormShared.test.tsx`
- `docs/superpowers/specs/2026-08-16-service-video-call-location-design.md`
- `docs/superpowers/plans/2026-08-16-service-video-call-location.md`
- `CONTINUITY.md`

# Receipts
- 2026-08-16 [TOOL] Calendar availability diagnostics regression was RED before implementation, then passed with Convex and workspace type checks, focused availability tests, `git diff --check`, and deployment.
- 2026-08-16 [TOOL] `serviceAvailabilityMigration:runNormalizePersonalServiceAssignments` completed in one batch for 9 records on the connected development deployment.
- 2026-08-16 [TOOL] Location-aware Google-health regression was RED for an in-person service, then passed 4/4 focused availability tests with Convex and workspace TypeScript checks and `git diff --check` under Node v22.22.0.
- 2026-08-16 [TOOL] `bunx convex dev --once` deployed the location-aware Google-health rule successfully to the connected development deployment.
- 2026-08-16 [TOOL] Simplified Google Calendar health and maintenance passed 34 focused tests, Convex and workspace TypeScript checks, `git diff --check`, and deployed successfully to the connected development deployment.
- 2026-08-16 [TOOL] Agent-scoped manual and CSV customer creation passed focused customer tests, Convex and workspace TypeScript checks, `git diff --check`, and deployed successfully to the connected development deployment.
- 2026-08-16 [TOOL] Safe personal-manual customer migration passed 5 focused tests, Convex and workspace TypeScript checks, deployed successfully, completed a dry run, and scanned 31 records successfully.
- 2026-08-16 [TOOL] Remote booking confirmation link regression passed 3 focused tests, Convex and workspace TypeScript checks, `git diff --check`, and deployed successfully to the connected development deployment.
- 2026-08-16 [TOOL] `git push` published `136f2315..889d8a25` to `origin/cursor/google-calendar-booking-sync-10b0`; `gh pr edit 56` replaced the stale Task 7–9 body with the full calendar, service, availability, and customer-scope change set.
- 2026-08-16 [TOOL] Video call service location passed 15 focused tests, Convex and workspace TypeScript checks, `git diff --check`, and deployed successfully to the connected development deployment.
- 2026-08-16 [TOOL] Full `bun test` is blocked by repository test-runner configuration outside this change: missing Stripe price environment variables, Bun lacks `import.meta.glob`, and a test expects unavailable `vi.advanceTimersByTimeAsync`; the Video call-focused tests remain green.
- 2026-08-16 [TOOL] Unified booking time inputs passed 4 focused tests, the Node v22 production build, and `git diff --check`.
