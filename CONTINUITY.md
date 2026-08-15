# CONTINUITY.md

# Snapshot
- 2026-08-15 [USER] Goal: develop Google Calendar booking sync on `cursor/google-calendar-booking-sync-10b0`; merge the current `origin/main` baseline locally.
- 2026-08-15 [CODE] Now: the active PostHog Google Calendar connect flag is wired into CalendarPage and hides the connection control until it evaluates true; the implementation is committed.
- 2026-08-15 [CODE] Now: Google-origin event badges are hidden while Kilobot badges remain; focused verification passed and the change is ready to commit.
- 2026-08-15 [USER] Now: make the connected Google Calendar status marker solid green by removing its white stroke.
- 2026-08-15 [USER] Now: show the Google Calendar icon before every Google-synced event title and expose `Event synced with Google Calendar` on hover.
- 2026-08-15 [USER] Next: continue Google Calendar feature work on this branch after the early-access connection gate.
- 2026-08-15 [USER] Approved Calendar header design: keep Today beside the visible month label; it selects today and switches the visible month to today.
- 2026-08-15 [USER] Approved implementation planning for the Calendar Today button.
- 2026-08-15 [USER] Superseded header action layout: New Booking fills the day-header row and is pinned to the far-right edge.
- 2026-08-15 [USER] D656 ACTIVE: Calendar creation actions use the booking dialog; the grid action is named Create Booking and first selects its date.
- 2026-08-15 [USER] D657 ACTIVE: Google Calendar connection controls are PostHog early access, currently enabled only for `leykwan132@gmail.com` and `kwanrealtyofficial@gmail.com`.
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

# Working set
- `src/components/calendar/GoogleCalendarConnectionCard.tsx`
- `src/components/calendar/GoogleCalendarSourceBadge.tsx`
- `src/components/calendar/CalendarEventDetailsBody.tsx`
- `src/pages/CalendarPage.tsx`
- `src/lib/posthogFeatureFlags.ts`
- `src/lib/posthogFeatureFlags.test.ts`
- `src/components/calendar/GoogleCalendarConnection.test.tsx`
- `docs/superpowers/specs/2026-08-15-google-calendar-connect-early-access-design.md`
- `docs/superpowers/plans/2026-08-15-google-calendar-connect-early-access.md`
- `docs/superpowers/specs/2026-08-15-calendar-google-event-indicators-design.md`
- `docs/superpowers/plans/2026-08-15-calendar-google-event-indicators.md`
- `CONTINUITY.md`

# Receipts
- 2026-08-15 [USER] Approved the corrected header-placement spec and requested implementation planning.
- 2026-08-15 [TOOL] Header-action test was RED before implementation; focused Calendar tests then passed 3/3 under Node v22.22.0, and `git diff --check` passed.
- 2026-08-15 [CODE] Committed the Calendar header action as `c4bde34a` (`Place Calendar New Booking in day header`).
- 2026-08-15 [USER] Approved the right-aligned dark header action and the no-events booking action design and spec; implementation plan is pending review.
- 2026-08-15 [USER] Approved replacing the source-level regression check with extracted Calendar presentation components and rendered behavior tests.
- 2026-08-15 [TOOL] Calendar day component tests were RED before the components existed, then focused Calendar verification passed 5/5 under Node v22.22.0 with `git diff --check` passing.
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
