# CONTINUITY.md

# Snapshot
- 2026-08-15 [USER] Goal: develop Google Calendar booking sync on `cursor/google-calendar-booking-sync-10b0`; merge the current `origin/main` baseline locally.
- 2026-08-15 [TOOL] Now: local branch was fast-forwarded to `origin/cursor/google-calendar-booking-sync-10b0`; merge conflicts with `origin/main` are resolved and the merge is awaiting verification/commit.
- 2026-08-15 [USER] Next: continue Google Calendar feature work on this branch.
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

# Working set
- `convex/appointmentBooking/availability.ts`
- `convex/appointmentBooking/availabilityRoster.ts`
- `convex/calendarEvents.ts`
- `convex/googleCalendar/bookingActions.ts`
- `convex/googleCalendar/bookingSync.ts`
- `convex/schema.ts`
- `src/components/calendar/CalendarCreateBookingDialog.tsx`
- `src/components/inbox/CreateCustomerBookingDialog.tsx`
- `docs/superpowers/plans/2026-08-13-google-calendar-sync.md`
- `CONTINUITY.md`

# Receipts
- 2026-08-15 [TOOL] Stashed the prior branch’s two unrelated workspace changes as `codex-auto-stash-before-google-calendar-branch-switch` before switching branches.
- 2026-08-15 [TOOL] Fetched `origin --prune`, switched local checkout to `cursor/google-calendar-booking-sync-10b0`, then fast-forwarded it to `5ed043cb`.
- 2026-08-15 [TOOL] `git merge --no-ff origin/main` encountered conflicts only in `CONTINUITY.md` and `convex/appointmentBooking/availability.ts`; resolution combines both feature sets.
