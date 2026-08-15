# CONTINUITY.md

# Snapshot
- 2026-08-15 [USER] Goal: develop Google Calendar booking sync on `cursor/google-calendar-booking-sync-10b0`; merge the current `origin/main` baseline locally.
- 2026-08-15 [CODE] Now: the active PostHog Google Calendar connect flag is wired into CalendarPage and hides the connection control until it evaluates true; the implementation is committed.
- 2026-08-15 [CODE] Now: Google-origin event badges are hidden while Kilobot badges remain; focused verification passed and the change is committed.
- 2026-08-15 [CODE] Now: connected Google Calendar status has a solid green badge with a white check, and Google-synced events show an icon before the title with the approved hover text; focused verification passed and the change is committed.
- 2026-08-15 [USER] Now: Google-synced event icons use a larger, vertically centered heading variant in the event-details modal only.
- 2026-08-15 [CODE] Now: the larger modal heading icon is implemented and focused verification passed; the change is committed.
- 2026-08-15 [CODE] Now: manual calendar events are local-only for disconnected creators and otherwise use the creator's primary Google Calendar with one refresh, idempotent writes, and rollback on failure; the implementation is committed.
- 2026-08-15 [USER] Next: continue Google Calendar feature work on this branch after the early-access connection gate.
- 2026-08-15 [USER] Approved Calendar header design: keep Today beside the visible month label; it selects today and switches the visible month to today.
- 2026-08-15 [USER] Approved implementation planning for the Calendar Today button.
- 2026-08-15 [USER] Superseded header action layout: New Booking fills the day-header row and is pinned to the far-right edge.
- 2026-08-15 [USER] D656 ACTIVE: Calendar creation actions use the booking dialog; the grid action is named Create Booking and first selects its date.
- 2026-08-15 [USER] D657 ACTIVE: Google Calendar connection controls are PostHog early access, currently enabled only for `leykwan132@gmail.com` and `kwanrealtyofficial@gmail.com`.
- 2026-08-15 [USER] D658 ACTIVE: a connected event creator's manual calendar event is fail-closed: Google write failure prevents the event from being retained locally.
- 2026-08-15 [USER] D659 ACTIVE: remote bookings generate a Google Meet link only through the assigned staff member's connected Google Calendar; connecting remains optional.
- 2026-08-15 [USER] D660 ACTIVE: service configuration exposes only Google Meet and In person; Google Meet remains unavailable until the current eligible user connects Google Calendar, with hover/focus connection guidance.
- 2026-08-15 [CODE] Now: services support Remote or In person meeting locations; remote AI and staff bookings use an idempotent Google Meet request only when the assigned teammate is connected, and the returned Meet link is stored on the booking event.
- 2026-08-15 [USER] Now: approved a two-step Create Service dialog: a personal service creates from the first step; a team service collects teammates on a second step. Close discards immediately.
- 2026-08-15 [USER] Open question: production availability is UNCONFIRMED; no release changelog entry is due.

# Decisions
- 2026-08-12 [USER] D637 ACTIVE: Google connections are individual; agent-created events belong to the assigned teammate’s primary calendar, and absent connections fail explicitly.
- 2026-08-12 [USER] D638 ACTIVE: Convex is the normalized read-through cache; synchronization is idempotent and refreshes at calendar, availability, and agent-operation boundaries.
- 2026-08-12 [USER] D639 ACTIVE: owners see external event details; teammates see Busy-only projections.
- 2026-08-13 [USER] D640 ACTIVE: customer-facing agent mutations are limited to confirmed Kilobot-created events in the active conversation.
- 2026-08-13 [USER] D641 ACTIVE: V1 is primary-calendar-only with Google push-assisted sync and fail-closed connected-calendar operations.
- 2026-08-13 [USER] D655 ACTIVE: staff manual bookings use every active, unarchived service; workflow service choices constrain AI booking only.
- 2026-08-14 [USER] D013 ACTIVE: booking availability requires service teammate assignment and calendar availability, while lead eligibility follows weekly hours and time off.

# Done (recent)
- 2026-08-13 [CODE] Tasks 1–6 complete through `5c650fd6`: Google connection/contracts, typed provider boundary, normalized sync, private availability, watch/push lifecycle, and conflict-safe idempotent writes.
- 2026-08-15 [CODE] Task 7 committed initial Google-backed booking orchestration at `8494f5c6`; follow-up reservation/ownership changes remain on the feature history.
- 2026-08-15 [TOOL] Fast-forwarded the local target branch by four commits from its remote tracking branch before merging `origin/main`.
- 2026-08-15 [CODE] Merge resolution retains Google Calendar availability health/cached-conflict checks plus service teammate assignment filtering.
- 2026-08-15 [CODE] Calendar Today button is restored beside the visible month using the existing shadcn Button and date-selection handler at `29ea71fb`; it remains unreleased.
- 2026-08-15 [CODE] Calendar New Booking is pinned to the selected-day header edge, shown in the shared no-events state, and opened by the grid Create Booking action after selecting its date; it remains unreleased.
- 2026-08-15 [CODE] Manual calendar-event creation now uses the Google-aware action, synchronizes connected creators' primary calendars fail-closed, and retains local-only behavior without a connection; connection status now shows a white check in its green badge. The feature remains unreleased.
- 2026-08-15 [CODE] The approved Create Service dialog design, including stacked assignment-card icons and advanced timing details, is committed at `7108bf85`.

# Working set
- `src/components/calendar/GoogleCalendarConnectionCard.tsx`
- `src/pages/CalendarPage.tsx`
- `src/components/calendar/GoogleCalendarConnection.test.tsx`
- `src/components/booking/CreateBookingDialog.test.ts`
- `convex/calendarEvents.ts`
- `convex/calendarEventsHelpers.ts`
- `convex/googleCalendar/calendarEventCreatePrepare.ts`
- `convex/googleCalendar/calendarEventCreateSync.ts`
- `convex/googleCalendarManualEventSync.test.ts`
- `convex/appointmentBooking/services.ts`
- `convex/googleCalendar/bookingPrepare.ts`
- `convex/googleCalendar/staffBookingPrepare.ts`
- `convex/googleCalendar/writeProvider.ts`
- `convex/googleCalendarProvider.test.ts`
- `src/components/services/ServiceLocationField.tsx`
- `src/components/services/CreateServiceWizard.tsx`
- `src/components/ServiceForm.tsx`
- `src/pages/ServicePage.tsx`
- `src/pages/ServicesPage.tsx`
- `docs/superpowers/specs/2026-08-15-create-service-dialog-design.md`
- `docs/superpowers/specs/2026-08-15-service-location-card-layout-design.md`
- `docs/superpowers/plans/2026-08-15-service-details-google-meet-guard.md`
- `docs/superpowers/specs/2026-08-15-manual-event-google-calendar-sync-design.md`
- `docs/superpowers/plans/2026-08-15-manual-event-google-calendar-sync.md`
- `CONTINUITY.md`

# Receipts
- 2026-08-15 [CODE] Committed the Calendar action components as `f2641c33` and CalendarPage integration as `5c08c8ef`.
- 2026-08-15 [TOOL] Full `bun run test` under Node v22.22.0 reconfirmed existing Google Calendar failures, including projection (4) and booking-sync (4); the new Calendar day-panel suite passed.
- 2026-08-15 [USER] Approved a unified booking-dialog design for header, no-events, and grid context-menu actions; spec review is pending.
- 2026-08-15 [USER] Approved the unified-booking spec and requested implementation planning.
- 2026-08-15 [TOOL] Unified booking-action tests were RED before implementation, then focused Calendar verification passed 10/10 under Node v22.22.0 with `git diff --check` passing.
- 2026-08-15 [CODE] Committed unified Calendar booking actions as `ec1637d9`.
- 2026-08-15 [TOOL] Full `bun run test` under Node v22.22.0 again reproduced the existing Google Calendar projection (4) and booking-sync (4) failures; the unified Calendar day-panel suite passed.
- 2026-08-15 [TOOL] Created active PostHog flag `enable_google_calendar_connect` (ID `822558`) with a 100% exact-email rollout for the requested early-access account.
- 2026-08-15 [USER] Approved the Google Calendar connect early-access spec and requested implementation planning.
- 2026-08-15 [TOOL] PostHog flag and Google Calendar connection focused tests were RED before implementation, then passed 17/17 under Node v22.22.0 with `git diff --check` passing.
- 2026-08-15 [CODE] Committed the client-side PostHog gate as `a9385f61`.
- 2026-08-15 [TOOL] Full `bun run test` under Node v22.22.0 again reproduced the existing Google Calendar projection (4) and booking-sync (4) failures; the PostHog connection-gate suite passed 13/13.
- 2026-08-15 [TOOL] Expanded the active PostHog connection-control rollout to the two approved email accounts, each at 100%.
- 2026-08-15 [TOOL] Google badge regression test was RED before implementation, then focused Calendar verification passed 13/13 under Node v22.22.0 with `git diff --check` passing.
- 2026-08-15 [TOOL] Google event-indicator tests were RED before implementation, then focused Calendar verification passed 14/14 under Node v22.22.0 with `git diff --check` passing.
- 2026-08-15 [TOOL] Modal Google icon test was RED before implementation, then focused Calendar verification passed 15/15 under Node v22.22.0 with `git diff --check` passing.
- 2026-08-15 [TOOL] Manual-event Google sync tests were RED before implementation, then focused API, backend, and UI verification passed 26/26 under Node v22.22.0 with `bunx tsc --noEmit` and `git diff --check` passing.
- 2026-08-15 [CODE] Committed manual-event Google synchronization as `e7f62b4d`, the public action integration as `c2a0d0de`, and the white-check indicator as `65f39dc2`.
- 2026-08-15 [TOOL] Full `bun run test` under Node v22.22.0 still reports pre-existing Google Calendar projection and booking-sync failures; the manual-event and connection-card suites passed.
- 2026-08-15 [CODE] Service location settings are committed at `1b524e6b`; the verified, uncommitted follow-up makes remote bookings request an idempotent Google Meet conference and requires Google to return its video link before local finalization.
- 2026-08-15 [TOOL] Final focused verification passed 43/43 under Node v22.22.0 with `bunx tsc --noEmit` and `git diff --check`; `convex/googleCalendarBookingSync.test.ts` continues to have its known four unrelated failures.
- 2026-08-15 [TOOL] Fresh full `bun run test` under Node v22.22.0 remains blocked by known Google Calendar projection (4), booking-sync (4), and projection-review (1) failures; the committed remote booking focused suite passed 43/43.
- 2026-08-15 [CODE] Service details now combines basic setup and duration while Booking team and Booking form remain separate; Google Meet is a guarded Location dropdown option and service-card activation controls are vertically centered.
- 2026-08-15 [TOOL] Focused Service details verification passed 9/9 under Node v22.22.0 with `bunx tsc --noEmit` and `git diff --check`.
