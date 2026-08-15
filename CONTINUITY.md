# CONTINUITY.md

# Snapshot
- 2026-08-15 [USER] Goal: develop Google Calendar booking sync on `cursor/google-calendar-booking-sync-10b0`; merge the current `origin/main` baseline locally.
- 2026-08-15 [CODE] Now: Calendar day header and no-events state use separate presentation components with dark permission-gated booking actions; integration commit is pending.
- 2026-08-15 [USER] Next: continue Google Calendar feature work on this branch after the Calendar action refinement.
- 2026-08-15 [USER] Approved Calendar header design: keep Today beside the visible month label; it selects today and switches the visible month to today.
- 2026-08-15 [USER] Approved implementation planning for the Calendar Today button.
- 2026-08-15 [USER] Superseded fixed-gap header placement: New Booking is right-aligned with the Today/date group left, and it appears in the no-events state.
- 2026-08-15 [USER] Approved the Calendar header-and-empty-state design.
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
- 2026-08-15 [CODE] Calendar New Booking is right-aligned in the selected-day header and available in the shared no-events state; both actions remain permission-gated and preserve the selected dialog date.

# Working set
- `src/components/calendar/CalendarSidebar.test.tsx`
- `src/components/calendar/CalendarDayHeader.tsx`
- `src/components/calendar/CalendarDayEmptyState.tsx`
- `src/components/calendar/CalendarDayPanel.test.tsx`
- `src/pages/CalendarPage.tsx`
- `docs/superpowers/specs/2026-08-15-calendar-new-booking-empty-state-design.md`
- `docs/superpowers/plans/2026-08-15-calendar-new-booking-empty-state.md`
- `CONTINUITY.md`

# Receipts
- 2026-08-15 [TOOL] Stashed the prior branch’s two unrelated workspace changes as `codex-auto-stash-before-google-calendar-branch-switch` before switching branches.
- 2026-08-15 [TOOL] Fetched `origin --prune`, switched local checkout to `cursor/google-calendar-booking-sync-10b0`, then fast-forwarded it to `5ed043cb`.
- 2026-08-15 [TOOL] `git merge --no-ff origin/main` encountered conflicts only in `CONTINUITY.md` and `convex/appointmentBooking/availability.ts`; merge commit `0b6c9760` combines both feature sets.
- 2026-08-15 [TOOL] Focused booking verification passed: 26 tests in 4 suites under Node v22.22.0.
- 2026-08-15 [USER] Approved the Calendar Today button design; implementation awaits review of its written spec.
- 2026-08-15 [USER] Approved the spec and requested implementation planning for the Calendar Today button.
- 2026-08-15 [TOOL] Calendar Today focused regression test passed 13/13 under Node v22.22.0; the first test run was RED because the formatted source places Today on a separate JSX line, then the assertion was made formatting-tolerant.
- 2026-08-15 [TOOL] Full `bun run test` under Node v22.22.0 failed in five existing Convex Google Calendar suites (14 failures): projection, booking sync, projection review, availability intervals, and availability roster budget. The Calendar header suite passed 13/13.
- 2026-08-15 [USER] Approved the Calendar sidebar New Booking floating-action design; implementation awaits review of its written spec.
- 2026-08-15 [USER] Approved the floating-action spec and requested implementation planning.
- 2026-08-15 [TOOL] Calendar sidebar floating-action test passed 3/3 under Node v22.22.0; the first test run was RED because New Booking appeared before View without positioning classes.
- 2026-08-15 [USER] Corrected New Booking placement to the right Calendar panel header, after the Today/date group; implementation awaits review of its written spec.
- 2026-08-15 [USER] Approved the corrected header-placement spec and requested implementation planning.
- 2026-08-15 [TOOL] Header-action test was RED before implementation; focused Calendar tests then passed 3/3 under Node v22.22.0, and `git diff --check` passed.
- 2026-08-15 [CODE] Committed the Calendar header action as `c4bde34a` (`Place Calendar New Booking in day header`).
- 2026-08-15 [USER] Approved the right-aligned dark header action and the no-events booking action design and spec; implementation plan is pending review.
- 2026-08-15 [USER] Approved replacing the source-level regression check with extracted Calendar presentation components and rendered behavior tests.
- 2026-08-15 [TOOL] Calendar day component tests were RED before the components existed, then focused Calendar verification passed 5/5 under Node v22.22.0 with `git diff --check` passing.
