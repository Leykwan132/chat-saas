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

# State

- 2026-08-14 [CODE] Now: personal Availability specification is user-approved and its test-first implementation plan is documented locally for draft PR #59.
- 2026-08-14 [TOOL] Next: select execution approach, then implement the personal-only header simplification; external deployment and PR update remain pending test-runner resolution or waiver.
- 2026-08-13 [USER] Open questions: none.

# Working set

- `src/components/TeamSwitcher.tsx`
- `src/components/WorkspaceUnavailable.tsx`
- `src/components/WorkspaceUnavailable.test.tsx`
- `src/layouts/DashboardLayout.tsx`
- `src/pages/ScheduleUserDetailPage.tsx`
- `src/pages/ScheduleUserAvailabilityPage.tsx`
- `src/components/schedule/`
- `src/lib/availabilityWorkspace.ts`
- `docs/superpowers/specs/2026-08-14-direct-availability-page-design.md`
- `docs/superpowers/plans/2026-08-14-direct-availability-page.md`
- `docs/superpowers/specs/2026-08-14-personal-availability-header-design.md`
- `docs/superpowers/plans/2026-08-14-personal-availability-header.md`
- `CONTINUITY.md`

# Receipts

- 2026-08-13 [TOOL] Manual booking availability suite passed 13/13 under Node v22.22.0; full Vitest has 10 established Docs runner/configuration suite failures unrelated to booking work.
- 2026-08-13 [TOOL] Created and checked out local branch `codex/fix-slot-availability-create`; 16 focused tests and `tsc --noEmit` passed before PR #58.
- 2026-08-13 [TOOL] Created and checked out local branch `codex/show-unavailable-availability`; preserved unrelated untracked `pricing-knowledge-base-updated.md`.
- 2026-08-13 [CODE] Committed approved availability-label design as `2b41926d`; specification self-review found no placeholders or ambiguous scope.
- 2026-08-13 [TOOL] RED: Weekly availability editor regression failed because the initial markup contained no “Unavailable” labels.
- 2026-08-13 [TOOL] GREEN: `bunx vitest run src/components/WeeklyAvailabilityEditor.test.ts` passed 4/4 under Node v22.22.0; `bunx tsc --noEmit` and `git diff --check` passed.
- 2026-08-14 [CODE] Committed approved roster-card hours design as `79caad36`; specification self-review found no placeholders or ambiguous scope.
- 2026-08-14 [TOOL] RED: SchedulePage roster-card regression failed because saved weekly hours were absent from card markup.
- 2026-08-14 [TOOL] GREEN: `bunx vitest run src/pages/SchedulePage.test.tsx` passed 1/1 after rendering saved hours and no-hours states; `bunx tsc --noEmit` and `git diff --check` passed under Node v22.22.0.
- 2026-08-14 [CODE] Committed approved availability-card metadata layout design as `1375df18`; specification self-review found no placeholders or ambiguous scope.
- 2026-08-14 [TOOL] RED: roster-card test showed Admin markup after the teammate name; availability lines had no clock icons.
- 2026-08-14 [TOOL] GREEN: `bunx vitest run src/pages/SchedulePage.test.tsx` passed 1/1 after the metadata reorder and clock rendering; `bunx tsc --noEmit` and `git diff --check` passed under Node v22.22.0.
- 2026-08-14 [TOOL] Pushed `codex/show-unavailable-availability`; GitHub plugin PR creation received integration 403, then CLI fallback created draft PR #59.
- 2026-08-14 [CODE] Approved workspace-defaults design covers personal and non-owner direct navigation, Owner/Admin/Member labels, and enabled default schedules for new agents and members.
- 2026-08-14 [TOOL] RED: schedule provisioning tests found no personal schedule and inactive organizational/member schedules; role and non-owner roster regressions also failed before implementation.
- 2026-08-14 [TOOL] GREEN: 15 focused tests, `tsc --noEmit`, and `git diff --check` passed under Node v22.22.0.
- 2026-08-14 [TOOL] Convex deployment verification is pending explicit authorization after `bunx convex dev --once` was correctly blocked as an external deployment action.
- 2026-08-14 [CODE] Approved workspace-switch design keeps real unavailable-workspace recovery intact while suppressing it during an active switch.
- 2026-08-14 [TOOL] RED: transition regression found no dashboard switch state or TeamSwitcher lifecycle callbacks.
- 2026-08-14 [TOOL] GREEN: workspace transition and availability page suites passed 7/7 with `tsc --noEmit` and `git diff --check` under Node v22.22.0.
- 2026-08-14 [CODE] Approved direct-Availability design places weekly-hours editing on the personal/member page and preserves organizational-owner teammate detail navigation.
- 2026-08-14 [CODE] User approved the direct-Availability specification; its implementation plan extracts a reusable weekly-hours editor and composes it inline only for direct views.
- 2026-08-14 [CODE] User approved a plan correction replacing source inspections with rendered route tests and extracting the oversized detail page into focused components.
- 2026-08-14 [TOOL] RED: direct personal Availability retained `Back to dashboard` and the edit-only availability link; the owner edit route hid its heading behind the old page-level skeleton.
- 2026-08-14 [TOOL] GREEN: 9 focused Availability tests, `tsc --noEmit`, and `git diff --check` pass under Node v22.22.0 after inline editor composition and page extraction.
- 2026-08-14 [TOOL] Full `bun test` is blocked independently of this work: 1,153 pass, 135 fail, and 87 errors from unsupported `import.meta.glob`, missing Stripe variables, and unsupported Vitest timer APIs.
- 2026-08-14 [CODE] Approved personal-header design removes personal profile metadata, adds purpose copy, and relocates the time-off action to its section heading.
- 2026-08-14 [CODE] User approved the personal-header specification; its implementation plan preserves organizational views while simplifying only personal Availability.
