# CONTINUITY.md

# Snapshot
- 2026-08-20 [USER] Goal: remove Messenger diagnostics and pause Instagram plus Website/KiloBot channel setup.
- 2026-08-20 [CODE] Now: Messenger OAuth and Page-list diagnostics are removed; the Instagram and Website/KiloBot channel-card containers are hidden.
- 2026-08-20 [TOOL] Next: create the review PR from the pushed branch using GitHub account permissions; the connected GitHub plugin cannot create PRs for this repository.
- 2026-08-20 [CODE] Open question: the Page picker repeats the Page fetch after the backend connection completes; it remains out of scope for this PR.

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
- 2026-08-20 [USER] D735 ACTIVE: Messenger’s backend wait is shown as a non-dismissible “Getting your Facebook Pages…” progress dialog until it succeeds, fails, or hands off to the Page picker.
- 2026-08-20 [USER] D736 ACTIVE: Messenger connection failures never display raw Convex, Meta, or backend error details to customers; embedded signup, Page picking, and classic OAuth use generic retry feedback.
- 2026-08-20 [USER] D737 ACTIVE: Messenger OAuth and Page-list diagnostics log request and response metadata plus the last four token characters when available, except Page-list input logs the full user access token; raw authorization codes, app secrets, and other access tokens remain excluded.
- 2026-08-20 [USER] D738 ACTIVE: the diagnostics PR includes Messenger logging only; billing and unrelated test-suite repairs are excluded.
- 2026-08-20 [USER] D739 ACTIVE: Messenger diagnostic logging is removed; Instagram and Website/KiloBot setup are paused by hiding their channel-card containers.

# Done (recent)
- 2026-08-20 [TOOL] PR #71 merged into `main`, isolating channel management by assigned agent.
- 2026-08-20 [TOOL] PR #72 merged into `main`, fixing agent-scoped Messenger error recording.
- 2026-08-20 [TOOL] Draft PR #73 opened from `codex/show-messenger-connection-progress` at commit `6f8f571`.
- 2026-08-20 [CODE] Added Messenger connecting feedback and customer-safe failure messaging across embedded signup, Page picking, and classic OAuth.
- 2026-08-20 [CODE] Removed Messenger OAuth and Page-list diagnostic logging; paused Instagram and Website/KiloBot setup by hiding their channel-card containers.
- 2026-08-20 [TOOL] Opened PR #69 from `codex/persist-workflow-node-positions` into `main` at commit `8fe01b8`.
- 2026-08-20 [CODE] Connected authenticated `WorkflowCanvas.onNodeMoved` to an immediate persisted position update; landing-preview dragging remains local-only.
- 2026-08-20 [CODE] Added regression coverage for the page callback, exact position payload, and a real create-move-reload Convex workflow journey.
- 2026-08-20 [TOOL] Node v22.22.0 focused workflow suite passes: 16 tests in 3 files; production build exits successfully. ESLint has no errors and one pre-existing `WorkflowPage` exhaustive-deps warning.
- 2026-08-20 [TOOL] Targeted review found no critical or important defects; it noted only that coverage is split across page wiring, action payload, and Convex reload tests rather than one browser drag integration.

# Working set
- 2026-08-20 [CODE] `src/pages/ChannelsPage.tsx`
- 2026-08-20 [CODE] `src/components/channels/AvailableChannelCard.test.ts`
- 2026-08-20 [CODE] `convex/messengerConnect.ts`
- 2026-08-20 [CODE] `convex/messengerConnectLogging.test.ts`
- 2026-08-20 [CODE] `CONTINUITY.md`

# Receipts
- 2026-08-20 [TOOL] Commit `145a52c` was pushed to `origin/codex/messenger-oauth-diagnostics`; focused regression tests pass (2), production build exits 0, and the GitHub plugin found no existing PR before PR creation failed with `403 Resource not accessible by integration`.
- 2026-08-20 [TOOL] Commit `7a43730` was pushed to `origin/codex/messenger-oauth-diagnostics`; focused Page-list token-log tests pass, and the GitHub plugin found no existing PR before PR creation failed with `403 Resource not accessible by integration`.
- 2026-08-20 [TOOL] Fresh Node v22.22.0 focused Messenger diagnostics tests pass (2); changed-file ESLint and `git diff --check` exit 0.
- 2026-08-20 [TOOL] Draft PR #73 created: `https://github.com/Leykwan132/chat-saas/pull/73`.
- 2026-08-20 [TOOL] Final Node v22.22.0 focused Messenger feedback suite passes (8); changed-file ESLint has zero errors and one pre-existing `ChannelsPage` hook-dependency warning; production build exits 0 with existing Meta app ID and large-chunk warnings.
- 2026-08-20 [TOOL] Re-review found no raw Convex, Meta, or backend error exposure across Messenger embedded signup, Page picking, or classic OAuth.
- 2026-08-20 [TOOL] Node v22.22.0 Messenger feedback tests (6) and changed-file ESLint checks pass after adding the generic error-message regression case.
- 2026-08-20 [TOOL] Node v22.22.0 focused Messenger feedback tests (5) and changed-file ESLint checks pass; production build exits 0 with existing missing Meta app ID and large-chunk warnings.
- 2026-08-20 [TOOL] The Messenger progress regression test failed before implementation because the dialog state/content exports did not exist, then passed after the behavior was added.
- 2026-08-20 [TOOL] New agent-channel isolation test passes under Node v22.22.0; production build exits 0, with existing Meta app ID and large-chunk warnings.
- 2026-08-20 [TOOL] Full `bun run test` with mock Stripe prices fails in unrelated calendar and agent-overview suites (18 tests across 6 files); the new channel test passes.
- 2026-08-20 [TOOL] `bunx convex codegen` is unavailable in this isolated worktree because `CONVEX_DEPLOYMENT` is unset.
- 2026-08-18 [TOOL] `origin/main` at `32a2ebe` contains merged PR #66; the removal branch is resolving that merge in favor of D727.
- 2026-08-18 [TOOL] Post-merge focused Vitest checks (7), loader test (1), and Node v22.22.0 production build passed; only existing Meta app ID and large-chunk Vite warnings remain.
- 2026-08-18 [TOOL] The incoming `src/googleAdsTag.test.mjs` verifies the Google Ads loader URL and config ID and remains intact.
- 2026-08-18 [TOOL] Escalation lifecycle (including a text-and-image inbound message) plus two inbox-marker tests pass; Node v22.22.0 production build passes. The lifecycle fixture emits pre-existing missing aggregate-component warnings after passing.
- 2026-08-18 [TOOL] `gh auth status` confirms the active GitHub token is invalid, so the requested branch push and draft PR cannot be created until `gh auth login -h github.com` succeeds.
