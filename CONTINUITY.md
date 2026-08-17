# CONTINUITY.md

# Snapshot
- 2026-08-17 [USER] Goal: default the Agent Overview homepage analytics range to Last 30 days with 1d, 7d, 30d, and 90d shortcuts, compact content-sized metrics, right-aligned date plus Daily/Cumulative controls, and contextual graph and lower-panel subtitles.
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
- 2026-08-17 [USER] D701 ACTIVE: Overview defaults to the rolling Last 30 days; dedicated usage pages retain their existing defaults.
- 2026-08-17 [USER] D702 ACTIVE: Overview metric cards are compact, text-only, content-sized selectable controls with a 12px label/value gap and 24px value type; the selected chart is 400px tall and uses `AI conversations`.
- 2026-08-17 [USER] D703 SUPERSEDED by D704: Overview date controls previously included Billing period.
- 2026-08-17 [USER] D704 ACTIVE: Overview shows the active date directly below its title, with only 1d, 7d, 30d, and 90d ghost buttons right-aligned on wider screens; the active range uses a muted fill and no custom picker is available.
- 2026-08-17 [USER] D705 ACTIVE: Overview’s Daily/Cumulative selector shares the right-aligned header control row with the date and range controls.
- 2026-08-17 [USER] D706 ACTIVE: Overview graph titles include a brief, plain-language muted subtitle appropriate to the selected metric and Daily/Cumulative aggregation.
- 2026-08-17 [USER] D707 ACTIVE: Common Topics and Customer Sentiment use brief muted subtitles; their medium sans-serif title typography matches the selected graph.
- 2026-08-17 [USER] D708 ACTIVE: Overview graph and lower-panel titles use tight line-height with a 2px title-description gap.
- 2026-08-17 [USER] D709 ACTIVE: Common Topics and Customer Sentiment use the same 20px horizontal inset as the Overview metric cards.
- 2026-08-17 [USER] D710 ACTIVE: Overview range and Daily/Cumulative controls bottom-align with the title/date block on wider screens.
- 2026-08-17 [USER] D711 ACTIVE: Overview title and active date use an 8px gap, with the date beneath the title.
- 2026-08-17 [USER] D712 ACTIVE: After initial Overview load, date-range changes retain the last completed dashboard content and show only a subtle busy state on the range controls; Daily/Cumulative changes remain immediate.
- 2026-08-17 [USER] D713 ACTIVE: Overview range buttons have concise top tooltips, and only the Overview Daily/Cumulative selector matches their fully rounded 32px text-sm styling.
- 2026-08-12 [USER] D637 ACTIVE: Google connections are individual; agent-created events use the assigned teammate’s primary calendar.
- 2026-08-12 [USER] D638 ACTIVE: Convex is the normalized read-through cache; synchronization is idempotent and refreshes at calendar, availability, and agent-operation boundaries.
- 2026-08-12 [USER] D639 ACTIVE: owners see external event details; teammates see Busy-only projections.
- 2026-08-13 [USER] D640 ACTIVE: customer-facing agent mutations are limited to confirmed Kilobot-created events in the active conversation.
- 2026-08-13 [USER] D641 ACTIVE: V1 is primary-calendar-only with Google push-assisted sync and fail-closed connected-calendar operations.
- 2026-08-13 [USER] D655 ACTIVE: staff manual bookings use every active, unarchived service; workflow service choices constrain AI booking only.
- 2026-08-14 [USER] D013 ACTIVE: booking availability requires service teammate assignment and calendar availability, while lead eligibility follows weekly hours and time off.

# Done (recent)
- 2026-08-17 [CODE] Agent Overview now defaults to Last 30 days, shows the active date beneath its title with an 8px gap, content-sized text-only metrics with increased label/value spacing and smaller values, bottom-aligned right-side range and Daily/Cumulative controls, and tightly paired plain-language title-description blocks in matching graph and lower-panel typography with aligned 20px insets; draft PR #62 tracks commit `0d66102d` on `codex/overview-date-range-controls`.
- 2026-08-15 [CODE] Milestone: Google Calendar connection, sync, fail-closed writes, Meet links, and `origin/main` merge landed on this branch.
- 2026-08-16 [CODE] Calendar booking UI, availability feedback, custom times, service dialogs, and Video call/Google Meet location behavior were implemented; booking create and edit flows share the fully rounded availability time combobox with a start–end separator.
- 2026-08-16 [CODE] Google health now blocks only Meet availability; daily maintenance renews watches and no longer sweeps stale syncs.
- 2026-08-16 [CODE] Manual and CSV customers persist active-agent scope; personal workspace entries keep owner scope.
- 2026-08-16 [CODE] Remote booking confirmation and update messages now include the Google Meet link when available.

# Working set
- `src/pages/AgentOverviewPage.tsx`
- `src/pages/AgentOverviewPage.test.tsx`
- `src/components/agent-overview/AgentOverviewDataModeSelect.tsx`
- `src/components/agent-overview/AgentOverviewMetrics.tsx`
- `src/components/agent-overview/AgentOverviewTimeRangeButtons.tsx`
- `src/components/agent-overview/AgentOverviewTrendChart.tsx`
- `docs/superpowers/specs/2026-08-17-overview-last-30-days-default-design.md`
- `docs/superpowers/specs/2026-08-17-overview-range-loading-and-controls-design.md`
- `docs/superpowers/plans/2026-08-17-overview-date-range-and-metric-layout.md`
- `docs/superpowers/plans/2026-08-17-overview-control-alignment.md`
- `docs/superpowers/plans/2026-08-17-overview-range-loading-and-controls.md`
- `CONTINUITY.md`

# Receipts
- 2026-08-17 [TOOL] Title-date spacing refinement passed the focused Overview regression, the Node v22.22.0 production build, and `git diff --check`; commit `0d66102d` was pushed to PR #62.
- 2026-08-17 [TOOL] Bottom-aligned header controls passed the focused Overview regression, the Node v22.22.0 production build, and `git diff --check`; commit `125b1678` was pushed to PR #62.
- 2026-08-17 [TOOL] Lower-panel inset alignment passed 5 focused tests, the Node v22.22.0 production build, and `git diff --check`; commit `b82de7b4` was pushed to PR #62.
- 2026-08-17 [TOOL] Overview copy and title-type refinement passed 7 focused tests, the Node v22.22.0 production build, and `git diff --check`; commit `82432d30` was pushed to PR #62.
- 2026-08-17 [TOOL] Date-under-title layout passed the focused Overview regression, the Node v22.22.0 production build, and `git diff --check`; commit `1409b6d3` was pushed to PR #62.
- 2026-08-17 [TOOL] Tight title-description spacing passed 5 focused tests, the Node v22.22.0 production build, and `git diff --check`; commit `4ba9dba5` was pushed to PR #62.
- 2026-08-17 [TOOL] Lower-panel descriptions and lighter titles passed 5 focused tests, the Node v22.22.0 production build, and `git diff --check`; commit `f239eebd` was pushed to PR #62.
- 2026-08-17 [TOOL] Graph-subtitle revision passed 5 focused tests, the Node v22.22.0 production build, and `git diff --check`; commit `570b1524` was pushed to PR #62.
- 2026-08-17 [TOOL] Metric spacing and typography refinement passed the focused Overview regression, the Node v22.22.0 production build, and `git diff --check`; commit `98174118` was pushed to PR #62.
- 2026-08-17 [TOOL] Daily/Cumulative header relocation passed the focused Overview regression, the Node v22.22.0 production build, and `git diff --check`; commit `d8726dfa` was pushed to PR #62.
- 2026-08-17 [TOOL] Compact-card and ghost-control revision passed 7 focused tests, the Node v22.22.0 production build, and `git diff --check`; commit `25e42830` was pushed to PR #62.
- 2026-08-17 [TOOL] The full Node v22 `bun test` run repeated the known unrelated baseline: 1270 pass, 161 fail, 112 errors, chiefly missing Stripe test environment variables, unsupported `import.meta.glob`, and unavailable `vi.advanceTimersByTimeAsync`.
- 2026-08-17 [TOOL] Overview 1d-range regression passed 4 focused tests; the production build passed, while Convex codegen's embedded typecheck did not report diagnostics.
- 2026-08-17 [TOOL] Draft PR #62 was created from `codex/overview-date-range-controls` against `main`; the local checkout tracks the pushed branch and is clean.
- 2026-08-17 [TOOL] Date-shortcut regression passed 7 focused tests, the Node v22.22.0 production build, and `git diff --check`; work remains local for user testing.
- 2026-08-17 [TOOL] Overview date-range and compact-layout regression was RED before implementation, then passed 7 focused tests, the Node v22.22.0 production build, and `git diff --check`; work remains local for user testing.
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
- 2026-08-16 [TOOL] Unified booking time inputs, including the shared pill styling and start–end separator, passed 4 focused tests, the Node v22 production build, and `git diff --check`.
- 2026-08-16 [TOOL] Removed the temporary `booking_slot_unavailable` availability diagnostic; the focused regression and Convex type check passed, and the connected development deployment updated successfully.
