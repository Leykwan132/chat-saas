# Snapshot

- 2026-08-13 [USER] Manual Create booking/New booking must work whenever an agent has active services; Book appointment workflow configuration is unrelated.
- 2026-08-13 [CODE] Branch `codex/fix-booking-active-services` separates staff manual-booking service eligibility from AI workflow eligibility. Inbox and Calendar option queries now return every active, unarchived service; AI booking sessions remain workflow-filtered.
- 2026-08-13 [TOOL] Regression tests were RED with empty service arrays in both manual flows, then GREEN: 4/4 focused tests, Node v22.22.0 `tsc --noEmit`, and `git diff --check` pass. The full Vitest command has 1,345 passing tests but exits non-zero on 10 established Docs runner/configuration suites outside this change.
- 2026-08-13 [TOOL] Commit `6affb7ac` is pushed to `origin/codex/fix-booking-active-services`; `git merge-tree --write-tree origin/main HEAD` completed without conflicts. GitHub PR creation is blocked by connector 403 `Resource not accessible by integration`, while local `gh` has an invalid token. Production availability is UNCONFIRMED; no changelog entry is due before release.
- 2026-08-13 [USER] A selected current day must keep only its circular selection indicator, without the square muted calendar background.
- 2026-08-13 [USER] The selected Calendar View filter needs fully rounded pill corners.
- 2026-08-13 [USER] When a weekly availability switch is off, retain the current layout and show the word “Unavailable”.
- 2026-08-14 [USER] Availability roster cards should show each teammate's compact available-time summary directly on the card.
- 2026-08-14 [USER] Move role and lead badges above the teammate name and add a clock alongside each card's availability summary.
- 2026-08-14 [USER] Personal Availability opens directly to the user's detail page; only organizational owners see the team roster; new schedules accept leads by default; role labels distinguish Owner, Admin, and Member.
- 2026-08-14 [USER] Switching workspaces must show a neutral switching state instead of a transient unavailable-workspace error.
- 2026-08-14 [USER] Personal and member Availability needs its own title, no dashboard back link, and inline editable weekly hours.
- 2026-08-14 [USER] Personal Availability should omit profile metadata, describe its purpose, and place Request time off with Time off.

# Done (recent)

- 2026-08-12 [CODE] Model catalogue refresh and announcement UI are implemented on `codex/model-catalog-refresh`; release/migration availability is UNCONFIRMED.
- 2026-08-11 [CODE] Landing WhatsApp live-demo and Amazon-model removal were completed on their respective branches; GitHub PR creation remains credential-blocked.

# Decisions

- 2026-08-13 D001 ACTIVE [USER] AI workflow service selections constrain AI booking only. Staff manual bookings use the active service catalogue.
- 2026-08-13 D002 ACTIVE [USER] Inbox Create booking and Calendar + New Booking default to the first valid 30-minute slot at or after the current time; there is no lead-time delay and temporal proximity overrides preferred times.
- 2026-08-13 D003 ACTIVE [USER] A disabled weekday retains its existing row and displays the muted label “Unavailable” in its time-slot area.
- 2026-08-14 D004 ACTIVE [USER] Roster cards retain their current contact and lead controls and add the existing compact weekly summary below their badges.
- 2026-08-14 D005 ACTIVE [USER] Card metadata badges precede the identity row, and every availability line uses a muted clock icon.
- 2026-08-14 D006 ACTIVE [USER] Availability uses direct self-detail navigation outside organizational owner context, and all future schedule provisioning starts enabled without altering existing schedules.
- 2026-08-14 D007 ACTIVE [USER] Active workspace switches take precedence over stale-route recovery and display only a switching loader until they succeed or fail.
- 2026-08-14 D008 ACTIVE [USER] Direct Availability views provide the complete weekly-hours editor in place, while organizational owner teammate details retain their compact summary and edit route.
- 2026-08-14 D009 ACTIVE [USER] Personal Availability omits the identity/status header, shows its leads-and-bookings purpose, and owns the time-off action within the Time off section.
- 2026-08-14 D010 ACTIVE [CODE] Root test verification uses `bun run test`, which runs Vitest for the application and Convex suites and Node's test runner for Docs; `bun test` bypasses the required Vite/Vitest environment.
- 2026-08-14 D011 ACTIVE [USER] Personal Availability loading mirrors the simplified completed page; organization member loading retains the teammate-detail skeleton.

# State

- 2026-08-14 [CODE] Now: personal Availability skeleton fix is committed locally; its loading state matches the simplified completed page without changing organization loading.
- 2026-08-14 [TOOL] Next: decide whether to push the committed work to draft PR #59; external deployment remains unapproved.
- 2026-08-13 [USER] Open questions: none.

# Working set

- `src/components/TeamSwitcher.tsx`
- `src/components/WorkspaceUnavailable.tsx`
- `src/components/WorkspaceUnavailable.test.tsx`
- `src/layouts/DashboardLayout.tsx`
- `src/pages/ScheduleUserDetailPage.tsx`
- `src/pages/ScheduleUserDetailPage.test.tsx`
- `src/pages/ScheduleUserAvailabilityPage.tsx`
- `src/components/schedule/`
- `src/lib/availabilityWorkspace.ts`
- `docs/superpowers/specs/2026-08-14-personal-availability-skeleton-design.md`
- `docs/superpowers/plans/2026-08-14-personal-availability-skeleton.md`
- `CONTINUITY.md`

# Receipts

- 2026-08-13 [TOOL] Created and checked out local branch `codex/show-unavailable-availability`; preserved unrelated untracked `pricing-knowledge-base-updated.md`.
- 2026-08-13 [CODE] Availability-label design committed as `2b41926d`; focused editor suite, TypeScript, and diff checks passed.
- 2026-08-14 [CODE] Roster card availability and metadata designs committed as `79caad36` and `1375df18`; focused suites, TypeScript, and diff checks passed.
- 2026-08-14 [TOOL] Pushed `codex/show-unavailable-availability`; GitHub plugin PR creation received integration 403, then CLI fallback created draft PR #59.
- 2026-08-14 [CODE] Workspace defaults and workspace-switch designs were implemented; focused suites, TypeScript, and diff checks passed. Deployment remains unapproved.
- 2026-08-14 [CODE] Direct Availability editing and the personal-header simplification were committed locally as `1d0bd376` and `62635f3b`.
- 2026-08-14 [TOOL] Initial full `bun test` failed because Bun's runner lacks the Vite/Vitest setup required by application and Convex tests; root `package.json` did not define a test script.
- 2026-08-14 [TOOL] RED: full Vitest reported 10 Docs Node-runner files as empty suites, a stale Thursday-only Calendar fixture, and a page-title source assertion made obsolete by component extraction.
- 2026-08-14 [TOOL] GREEN: corrected Calendar and page-title tests passed 3/3 under Node v22.22.0.
- 2026-08-14 [TOOL] GREEN: `bun run test` exits 0 under Node v22.22.0; it runs the full Vitest application/Convex suite and Docs Node suite (63/63).
- 2026-08-14 [TOOL] GREEN: `bunx tsc --noEmit` and `git diff --check` pass under Node v22.22.0.
- 2026-08-14 [CODE] Approved skeleton design keeps personal Availability loading free of teammate-profile placeholders and leaves organizational loading intact.
- 2026-08-14 [TOOL] RED: personal Availability loading rendered the generic teammate-detail skeleton without the page title or purpose description.
- 2026-08-14 [TOOL] GREEN: focused Availability route tests passed 3/3, TypeScript and diff checks passed, and the full `bun run test` command exited 0 under Node v22.22.0.
