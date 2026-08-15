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
- 2026-08-14 [USER] Availability hours must load instead of remaining indefinitely on the weekly editor skeleton; lead-eligibility simplification is paused until this is fixed.
- 2026-08-14 [USER] Direct organizational-admin Availability needs the same explanatory copy as the personal view.
- 2026-08-14 [USER] Remove Accepting leads; weekly hours and time off govern leads, while selected teammates govern which services they can book.
- 2026-08-14 [USER] Service editing prioritizes booking assignment, limits bulk teammate inclusion to new services, and removes booking-status metric tiles.
- 2026-08-14 [CODE] Merged `origin/main` adds the standalone AI Lead Temperature pricing feature and its Growth-only compact-card callout.

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
- 2026-08-14 D012 ACTIVE [USER] Every direct Availability view explains that it sets availability for leads and bookings.
- 2026-08-14 D013 ACTIVE [USER] Lead eligibility is based only on weekly hours and time off; booking also requires service teammate assignment and calendar availability.
- 2026-08-14 D014 ACTIVE [USER] Any direct Availability view, including an organizational admin's self-view, omits name, email, and role metadata.
- 2026-08-14 D015 ACTIVE [USER] Service teammate selection uses switches; the routing-strategy control is labeled “Assignment method.”
- 2026-08-14 D016 ACTIVE [USER] Availability shows each teammate's active assigned services between available hours and Time off.
- 2026-08-14 D017 ACTIVE [USER] The service editor labels its top-level enabled switch as Active or Inactive.
- 2026-08-14 D018 ACTIVE [USER] Service teammate helper copy is “Bookings go to selected teammates who are available.”
- 2026-08-14 D019 ACTIVE [USER] Each service teammate switch shows whether that teammate is Included or Not included.
- 2026-08-14 D020 ACTIVE [USER] Availability lists Active services as compact cards with name, duration, and an optional service description.
- 2026-08-14 D021 ACTIVE [USER] Service teammate selection includes a one-click Include all teammates action alongside individual switches.
- 2026-08-14 D022 ACTIVE [USER] Every Availability detail page embeds the weekly timetable directly; no Availability detail page shows Active services.
- 2026-08-14 D023 ACTIVE [USER] Service editing uses left-side section navigation and no longer displays booking-status metric tiles.
- 2026-08-14 D024 SUPERSEDED [USER] Booking assignment was initially the first service-editor section; Include all teammates remains create-only.
- 2026-08-14 D025 ACTIVE [USER] Service-editor navigation uses icons and the order Service details, Appointment duration, Booking team, and Booking form.
- 2026-08-14 D026 ACTIVE [USER] AI Lead Temperature is available from Starter upward; only Growth compact cards call it out directly, while Business inherits the capability.
- 2026-08-14 D027 ACTIVE [USER] Workflow service links open the service detail page on its Service details pane; its name field label is Name.
- 2026-08-15 D028 SUPERSEDED [USER] Standard Book appointment nodes directly list active services, their assigned teammate count and hover names, and immediate-save booking switches; the inspector no longer duplicates that selection.
- 2026-08-15 D029 SUPERSEDED [USER] Standard Book appointment nodes remain the direct service-selection surface; their detail panels also show a read-only summary of currently enabled services and assigned teammates.
- 2026-08-15 D030 ACTIVE [USER] Book appointment nodes and their detail panels use the same direct service-switch controls; only their surrounding layout differs.
- 2026-08-15 D031 ACTIVE [USER] Full editable workflow nodes expose their primary action controls directly; Human escalation surfaces and directly edits its incoming `When` condition.
- 2026-08-15 D032 ACTIVE [USER] Workflow Cleanup uses measured rendered node dimensions when available, preserving its horizontal or vertical arrangement without overlap.
- 2026-08-15 D033 ACTIVE [USER] Workflow toolbar description is “Tighter control over every step of your agent’s responses, content, bookings, and conversation routing.”
- 2026-08-15 D034 ACTIVE [USER] When Book appointment has no active services, its shared node and inspector control uses the standard Empty component with an agent-scoped Create service action.

# State

- 2026-08-15 [CODE] Now: Book appointment's shared service control renders the standard Empty component and agent-scoped Create service action for an all-inactive service list; its CTA is drag/pan isolated in workflow-node presentation and the branch is pushed.
- 2026-08-15 [TOOL] PR creation is blocked: the GitHub integration returns 403 `Resource not accessible by integration` and local `gh auth status` reports the active token invalid. The pushed compare URL is `https://github.com/Leykwan132/chat-saas/compare/main...codex/book-appointment-service-empty-state?expand=1`.
- 2026-08-15 [TOOL] RED then GREEN: no-active-services and node CTA-isolation regressions failed against the old rendering, then passed; Node v22.22.0 `bun run test`, `bun run build`, and `git diff --check` exit 0 after review fixes.
- 2026-08-15 [TOOL] PR #59 is open at the latest verified branch commit `b8348407`; GitHub integration metadata updates remain blocked by a 403 permission error. Production deployment remains unapproved.
- 2026-08-14 [USER] Open question: owner-controlled admin roster permission remains a separate pending design.

# Working set

- `src/components/workflow/workflowLayout.ts`
- `src/components/workflow/workflowLayoutMeasurements.ts`
- `src/components/workflow/workflowLayoutMeasurements.test.ts`
- `src/components/workflow/workflowLayout.test.ts`
- `src/components/workflow/WorkflowCanvas.tsx`
- `src/components/workflow/WorkflowBookingNodeServices.tsx`
- `src/components/workflow/WorkflowBookingNodeServices.test.tsx`
- `src/pages/useWorkflowMessageActions.ts`
- `src/pages/workflowLayoutPersistence.ts`
- `src/pages/workflowLayoutPersistence.test.ts`
- `docs/superpowers/specs/2026-08-15-workflow-cleanup-measured-nodes-design.md`
- `docs/superpowers/plans/2026-08-15-workflow-cleanup-measured-nodes.md`
- `docs/superpowers/specs/2026-08-15-book-appointment-service-empty-state-design.md`
- `docs/superpowers/plans/2026-08-15-book-appointment-service-empty-state.md`
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
- 2026-08-14 [TOOL] RED: an editor given a complete cached schedule still rendered only skeleton rows because post-mount effects reset its ready state.
- 2026-08-14 [TOOL] GREEN: the cached-schedule regression, 8 focused Availability tests, TypeScript, diff checks, and full `bun run test` all pass under Node v22.22.0.
- 2026-08-14 [TOOL] RED then GREEN: organizational-admin direct Availability lacked the purpose description; the new route test, TypeScript, and diff checks pass under Node v22.22.0.
- 2026-08-14 [CODE] Added optional service teammate assignments with a bounded backfill migration; new services start with all teammates selected and joining teammates are appended to migrated service assignments.
- 2026-08-14 [CODE] Lead eligibility and appointment availability now ignore legacy schedule status, use weekly hours and time off, and booking additionally filters to the service's selected teammates and calendar conflicts.
- 2026-08-14 [TOOL] GREEN: direct organizational-admin Availability no longer renders profile metadata; its focused route test, TypeScript, and diff checks pass under Node v22.22.0.
- 2026-08-14 [TOOL] GREEN: service teammate switches and naming pass their focused component/form tests, TypeScript, and diff checks under Node v22.22.0.
- 2026-08-14 [TOOL] GREEN: Availability services data and placement pass focused Convex/page/component tests, TypeScript, generated API types, and diff checks under Node v22.22.0.
- 2026-08-14 [TOOL] GREEN: top-level service status label passes its focused page test, TypeScript, and diff checks under Node v22.22.0.
- 2026-08-14 [TOOL] GREEN: simplified service teammate helper copy passes its focused component test, TypeScript, and diff checks under Node v22.22.0.
- 2026-08-14 [TOOL] GREEN: teammate inclusion labels pass the focused service component test, TypeScript, and diff checks under Node v22.22.0.
- 2026-08-14 [CODE] Active-services cards and bulk teammate-selection design documented in commits `9aea3196` and `b4841a80`; implementation awaits user review of the design document.
- 2026-08-14 [CODE] Implementation plan self-reviewed: every approved requirement maps to a task; no placeholders or contradictory interfaces remain.
- 2026-08-14 [TOOL] GREEN: Active services cards and Include all teammates pass 8 focused tests, TypeScript, and diff checks under Node v22.22.0.
- 2026-08-14 [TOOL] GREEN: full `bun run test` passes with 425 test files and 1,361 tests under Node v22.22.0 after updating the schedule-query contract fixture.
- 2026-08-14 [CODE] Inline Availability timetable design documented and committed as `1e6696ce`; implementation awaits user review of the design document.
- 2026-08-14 [CODE] Inline timetable implementation plan self-reviewed: it covers each approved layout and query change without placeholders or interface mismatches.
- 2026-08-14 [TOOL] GREEN: Availability detail pages have no service payload/cards and embed the timetable for team owners; 7 focused tests, TypeScript, diff checks, and full `bun run test` pass under Node v22.22.0.
- 2026-08-14 [CODE] Service-editor navigation design and priority update documented in commits `db817dbd` and `ef7d65c7`.
- 2026-08-14 [CODE] Service editing now prioritizes Booking assignment in focused left-side navigation, omits booking-status metrics, and restricts Include all teammates to service creation.
- 2026-08-14 [TOOL] GREEN: 426 test files / 1,363 tests, 63 Docs tests, the 3 focused service editor tests, `bunx tsc --noEmit`, and `git diff --check` pass under Node v22.22.0.
- 2026-08-14 [TOOL] GREEN: service navigation icon/copy test, `bunx tsc --noEmit`, and `git diff --check` pass under Node v22.22.0.
- 2026-08-14 [TOOL] GREEN: the full `bun run test` suite passes with 426 test files / 1,363 tests and 63 Docs tests under Node v22.22.0 after the navigation icon update.
- 2026-08-14 [TOOL] GREEN: the Booking team navigation-order test, `bunx tsc --noEmit`, and `git diff --check` pass under Node v22.22.0.
- 2026-08-14 [TOOL] Merge receipt: `origin/main` commit `db0c156a` adds AI Lead Temperature pricing work; its draft PR is #60.
- 2026-08-14 [TOOL] GREEN: after merge commit `1184ae98`, `bun run test` passed 426 files / 1,363 tests and 63 Docs tests; `bunx tsc --noEmit` and `git diff --check` passed under Node v22.22.0.
- 2026-08-14 [TOOL] RED then GREEN: ServiceForm initially selected Booking team; the focused regression now confirms Service details is selected first and its Name field is visible under Node v22.22.0.
- 2026-08-15 [TOOL] RED then GREEN: workflow services did not expose assigned teammates, booking-node flow data did not carry the agent/selection, and the inspector retained duplicate controls; 5 focused suites, TypeScript, diff checks, and `bun run test` (429 files / 1,369 tests plus 63 Docs tests) pass under Node v22.22.0.
- 2026-08-15 [USER] Book appointment inspectors must also display the enabled services; the canvas node remains the direct switch control.
- 2026-08-15 [TOOL] RED then GREEN: inspector-service selection initially lacked `getSelectedBookingServices`; the behavior test now confirms explicit selection excludes inactive services and legacy nodes include every active service. The 2 focused workflow suites, TypeScript validation, and `git diff --check` pass under Node v22.22.0.
- 2026-08-15 [TOOL] GREEN: `bun run test` passes under Node v22.22.0 with 429 application/Convex test files (1,370 tests) and 63 Docs tests. Known test-runner stderr remains non-failing and unrelated to this UI change.
- 2026-08-15 [USER] Book appointment detail panels must use the same switch-enabled service component as their canvas nodes.
- 2026-08-15 [TOOL] RED then GREEN: inspector-presentation markup initially lacked the shared component presentation marker; it now renders every active service with its existing live switch and excludes inactive services. Three focused workflow suites, TypeScript validation, and `git diff --check` pass under Node v22.22.0.
- 2026-08-15 [TOOL] GREEN: `bun run test` passes under Node v22.22.0 with 430 application/Convex test files (1,370 tests) and 63 Docs tests. Known test-runner stderr remains non-failing and unrelated to this UI change.
- 2026-08-15 [USER] Full editable nodes should provide direct action controls, and Human escalation must show its incoming `When` condition.
- 2026-08-15 [CODE] Workflow node-controls design and implementation plan are committed as `1432038c` and `16193d83`; user-approved execution mode is pending.
- 2026-08-15 [TOOL] GREEN: Node v22.22.0 `bun run test` completed with 432 application/Convex test files (1,378 tests) and 63 Docs tests. Known unrelated test stderr remains non-failing.
- 2026-08-15 [USER] Cleanup must account for the larger inline workflow controls; approved use of measured rendered node dimensions instead of fixed compact-card assumptions.
- 2026-08-15 [CODE] Measured-node Cleanup design and implementation plan are committed as `b3d03c00` and `9e593307`; user-approved execution mode is pending.
- 2026-08-15 [TOOL] GREEN: Node v22.22.0 `bun run test` completed with 433 application/Convex test files (1,381 tests) and 63 Docs tests after measured Cleanup verification. Known unrelated test stderr remains non-failing.
- 2026-08-15 [TOOL] Pushed `codex/show-unavailable-availability` through `b8348407`; existing PR #59 targets `main` from that branch. Connector metadata update returned 403 `Resource not accessible by integration`; local `gh` authentication is expired.
- 2026-08-15 [TOOL] GREEN: fixed the pasted `tsc -b` errors; 6 focused suites (16 tests), Node v22.22.0 `bun run build`, and `git diff --check` pass.
- 2026-08-15 [TOOL] RED then GREEN: the Workflow toolbar copy regression failed for the prior description and passes for the approved tighter-control wording.
- 2026-08-15 [TOOL] GREEN: workflow Cleanup measurement and layout tests pass 5/5 after preserving type-guard narrowing in the measurements map; the local `tsc -b` command exceeded terminal capture without producing an error.
