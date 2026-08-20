# CONTINUITY.md

# Snapshot
- 2026-08-20 [USER] Goal: a new agent’s Channels page must not show a channel connected to another agent.
- 2026-08-20 [CODE] Now: Channels requests the current route agent and the backend returns only that owned agent’s assigned channels.
- 2026-08-20 [CODE] Next: publish `codex/isolate-agent-channels` as a PR; add a release changelog entry only when production availability is confirmed.
- 2026-08-20 [ASSUMPTION] Existing channel ownership is represented by `defaultAgentId`; unassigned legacy channels are not displayed as belonging to an arbitrary agent.

# Decisions
- 2026-08-18 [USER] D727 ACTIVE: the app does not send Google Ads conversion events; the installed Google tag measures the configured onboarding conversion.
- 2026-08-18 [USER] D728 ACTIVE: an AI escalation links to the exact incoming message used as the AI turn prompt; action history jumps to that marker in the conversation.
- 2026-08-18 [USER] D733 ACTIVE: Inbox-only dummy preview code is removed; escalation dividers use neutral styling and disclose the stored customer request plus AI handoff context on click.
- 2026-08-18 [USER] D729 SUPERSEDED by D733: the dummy preview no longer exists.
- 2026-08-18 [USER] D730 ACTIVE: the neutral escalation divider uses the escalation-triangle icon rather than a question-mark icon.
- 2026-08-18 [USER] D731 ACTIVE: expanded escalation details use readable text and label the AI-provided rationale “Why it needs a human.”
- 2026-08-18 [USER] D732 ACTIVE: Action History’s View in chat control uses a neutral fully rounded background.
- 2026-08-18 [USER] D726 SUPERSEDED by D727: unauthenticated “Start for free” CTAs do not use an app conversion helper.
- 2026-08-17 [USER] D724 ACTIVE: hovering an overview distribution row expands its matching donut slice and renders the selected label and customer count inside the donut center.
- 2026-08-17 [USER] D720 ACTIVE: `?dummyData=true` supplies browser-only Common Topics and Customer Sentiment data in local development and must be removed before PR #63 merges.
- 2026-08-17 [USER] D701–D718 ACTIVE: Agent Overview uses the 30-day range and contextual compact controls; Q&A includes reusable support-question presets; topic analytics are plan-entitled with an upgrade path.
- 2026-08-17 [USER] D725 ACTIVE: landing benefit cards use the supplied revised portrait images at full grid-column width above customer-outcome copy on a zinc-gray section background; the booking card retains “Turn Enquiries Into Bookings” and makes KiloBot’s booking lifecycle automation explicit.
- 2026-08-16 [USER] D637–D700 ACTIVE: Google Calendar remains individual and primary-calendar-only; connected writes fail closed and manual/CSV customers retain active-agent scope.
- 2026-08-20 [USER] D734 ACTIVE: Channel management is agent-scoped; a channel assigned to one agent must not appear on another agent’s Channels page.

# Done (recent)
- 2026-08-20 [CODE] Added authenticated agent-scoped channel retrieval and wired the Channels page to its route agent, preventing cross-agent channel cards.
- 2026-08-20 [TOOL] Opened PR #69 from `codex/persist-workflow-node-positions` into `main` at commit `8fe01b8`.
- 2026-08-20 [CODE] Connected authenticated `WorkflowCanvas.onNodeMoved` to an immediate persisted position update; landing-preview dragging remains local-only.
- 2026-08-20 [CODE] Added regression coverage for the page callback, exact position payload, and a real create-move-reload Convex workflow journey.
- 2026-08-20 [TOOL] Node v22.22.0 focused workflow suite passes: 16 tests in 3 files; production build exits successfully. ESLint has no errors and one pre-existing `WorkflowPage` exhaustive-deps warning.
- 2026-08-20 [TOOL] Targeted review found no critical or important defects; it noted only that coverage is split across page wiring, action payload, and Convex reload tests rather than one browser drag integration.
- 2026-08-20 [TOOL] Confirmed this is a linked isolated workspace at `/Users/leykwanchoo/.codex/worktrees/e0ef/chat-saas` in detached HEAD state; a feature branch will be created before committing.

# Working set
- 2026-08-20 [CODE] `convex/channels.ts`
- 2026-08-20 [CODE] `convex/channels.test.ts`
- 2026-08-20 [CODE] `src/pages/ChannelsPage.tsx`
- 2026-08-20 [CODE] `src/pages/WorkflowPage.tsx`
- 2026-08-20 [CODE] `src/pages/useWorkflowMessageActions.ts`
- 2026-08-20 [CODE] `src/pages/WorkflowPage.test.ts`
- 2026-08-20 [CODE] `convex/workflows.ts`
- 2026-08-20 [CODE] `convex/workflows.test.ts`
- 2026-08-18 [CODE] `CONTINUITY.md`

# Receipts
- 2026-08-20 [TOOL] New agent-channel isolation test passes under Node v22.22.0; production build exits 0, with existing Meta app ID and large-chunk warnings.
- 2026-08-20 [TOOL] Full `bun run test` with mock Stripe prices fails in unrelated calendar and agent-overview suites (18 tests across 6 files); the new channel test passes.
- 2026-08-20 [TOOL] `bunx convex codegen` is unavailable in this isolated worktree because `CONVEX_DEPLOYMENT` is unset.
- 2026-08-18 [TOOL] `origin/main` at `32a2ebe` contains merged PR #66; the removal branch is resolving that merge in favor of D727.
- 2026-08-18 [TOOL] Post-merge focused Vitest checks (7), loader test (1), and Node v22.22.0 production build passed; only existing Meta app ID and large-chunk Vite warnings remain.
- 2026-08-18 [TOOL] The incoming `src/googleAdsTag.test.mjs` verifies the Google Ads loader URL and config ID and remains intact.
- 2026-08-18 [TOOL] Local `gh` authentication is invalid and GitHub connector writes previously returned 403; follow-up PR creation will be retried after pushing.
- 2026-08-18 [TOOL] Follow-up branch `codex/google-ads-signup-conversion` was pushed at `0c1daac`; GitHub connector PR creation returned an internal error and `gh auth status` confirms its token is invalid.
- 2026-08-17 [TOOL] PR #64 merge resolution passed focused landing-and-overview tests, the Node v22.22.0 production build, and `git diff --check`.
- 2026-08-18 [TOOL] Escalation lifecycle (including a text-and-image inbound message) plus two inbox-marker tests pass; Node v22.22.0 production build passes. The lifecycle fixture emits pre-existing missing aggregate-component warnings after passing.
- 2026-08-18 [TOOL] `gh auth status` confirms the active GitHub token is invalid, so the requested branch push and draft PR cannot be created until `gh auth login -h github.com` succeeds.
- 2026-08-18 [TOOL] Branch `codex/inbox-escalation-trace` was pushed at `5db1b2c`; GitHub plugin PR creation returned 403 `Resource not accessible by integration`.
- 2026-08-18 [TOOL] Primary checkout `/Users/leykwanchoo/Desktop/Projects/chat-saas` is clean on local tracking branch `review/inbox-escalation-trace` at `d2ce093`, matching `origin/codex/inbox-escalation-trace`.
- 2026-08-18 [TOOL] Dummy preview regression test, escalation lifecycle tests, inbox timeline tests, and the Node v22.22.0 production build pass; the lifecycle fixture retains its pre-existing missing aggregate-component warning.
- 2026-08-18 [TOOL] Long-thread dummy preview regression test plus focused escalation and inbox tests pass; the Node v22.22.0 production build passes with the existing aggregate-component fixture warning.
- 2026-08-18 [TOOL] Shared Action History and neutral expandable-divider tests, the focused Inbox suite, and the Node v22.22.0 production build pass.
- 2026-08-18 [TOOL] Escalation-triangle divider regression test and Node v22.22.0 production build pass.
- 2026-08-18 [TOOL] Readable-detail divider regression test and Node v22.22.0 production build pass.
- 2026-08-18 [TOOL] Neutral View in chat regression test and Node v22.22.0 production build pass.
- 2026-08-18 [TOOL] Inbox dummy-preview removal passed 8 relevant tests and the Node v22.22.0 production build; the lifecycle fixture retains its known missing aggregate-component warning.
- 2026-08-18 [TOOL] Draft PR #68 was created from `codex/inbox-escalation-trace` into `main` via authenticated GitHub CLI after the connector returned 403.
