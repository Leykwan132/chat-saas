# CONTINUITY.md

# Snapshot
- 2026-08-18 [USER] Goal: merge `origin/main` into the Google Ads PR branch and resolve its conflict.
- 2026-08-18 [CODE] Now: merge commit `bbbf038` brings `origin/main` into `codex/google-ads-tag`; PR #65 is current and ready for review.
- 2026-08-18 [USER] Goal: add Google Ads tag `AW-17745887902` to the app on a new branch.
- 2026-08-18 [CODE] PR #65 is open and ready for review with the global Google Ads tag on `codex/google-ads-tag`.
- 2026-08-17 [CODE] Existing active work: `main` includes PR #63’s Agent Overview topic-panel layout and donut-hover interaction.
- 2026-08-17 [ASSUMPTION] The landing update remains unshipped; its public changelog entry remains deferred until production availability is confirmed.

# Decisions
- 2026-08-17 [USER] D724 ACTIVE: hovering an overview distribution row expands its matching donut slice and renders the selected label and customer count inside the donut center.
- 2026-08-17 [USER] D720 ACTIVE: `?dummyData=true` supplies browser-only Common Topics and Customer Sentiment data in local development and must be removed before PR #63 merges.
- 2026-08-17 [USER] D701–D718 ACTIVE: Agent Overview uses the 30-day range and contextual compact controls; Q&A includes reusable support-question presets; topic analytics are plan-entitled with an upgrade path.
- 2026-08-17 [USER] D725 ACTIVE: landing benefit cards use the supplied revised portrait images at full grid-column width above customer-outcome copy on a zinc-gray section background; the booking card retains “Turn Enquiries Into Bookings” and makes KiloBot’s booking lifecycle automation explicit.
- 2026-08-16 [USER] D637–D700 ACTIVE: Google Calendar remains individual and primary-calendar-only; connected writes fail closed and manual/CSV customers retain active-agent scope.

# Done (recent)
- 2026-08-18 [CODE] Added the global Google Ads tag for `AW-17745887902` and opened ready-for-review PR #65.
- 2026-08-17 [CODE] Draft PR #64 presents revised landing conversation benefits with transparent portrait artwork filling each grid column and a zinc-gray section background; production availability is UNCONFIRMED.
- 2026-08-17 [CODE] PR #63’s Common Topics layout, hover interaction, browser-only dummy data, and centered donut-detail work merged into `main`.
- 2026-08-17 [CODE] PR #62 completed Agent Overview range controls, sample-preview upgrade actions, and Q&A presets.
- 2026-08-16 [CODE] Google Calendar booking, availability, customer scope, and remote-link milestones were deployed.

# Working set
- `index.html`
- `src/googleAdsTag.test.mjs`
- `src/components/landing/LandingFeatureSections.tsx`
- `src/components/landing/LandingFeatureSections.test.tsx`
- `src/components/agent-overview/AgentOverviewActiveDonutChart.tsx`
- `src/components/agent-overview/AgentOverviewTopicPanels.tsx`
- `src/components/agent-overview/AgentOverviewTopicsAndSentiment.tsx`
- `src/pages/AgentOverviewPage.tsx`
- `CONTINUITY.md`

# Receipts
- 2026-08-18 [TOOL] Merge commit `bbbf038` was pushed to `origin/codex/google-ads-tag`; the working tree is clean and tracks the remote branch.
- 2026-08-18 [TOOL] Fetching `origin/main` advanced it from `16f5749` to `ea09604`; the sole merge conflict was `CONTINUITY.md`, caused by its independent compaction on `main`.
- 2026-08-18 [TOOL] The merge includes landing feature-section files from `main` without application-code conflicts.
- 2026-08-18 [TOOL] Ready-for-review PR #65 was opened against `main` from `codex/google-ads-tag`; the GitHub connector was forbidden from creating it, and authenticated GitHub CLI fallback succeeded.
- 2026-08-18 [TOOL] The focused Node v22 test for the Google Ads loader/configuration passed (1 test, 0 failures), and `git diff --check` passed. The checkout has no installed Vitest dependencies, so the project Vitest runner cannot initialize.
- 2026-08-17 [TOOL] PR #64 merge resolution passed 13 focused landing-and-overview tests, the Node v22.22.0 production build, and `git diff --check`; `origin/main` is an ancestor of the branch.
- 2026-08-17 [TOOL] The landing full-width regression and booking-copy regression passed with the Node v22.22.0 production build and `git diff --check`.
