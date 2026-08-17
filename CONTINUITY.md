# CONTINUITY.md

# Snapshot
- 2026-08-17 [USER] Goal: resolve PR #64 against the current `main` while preserving the revised landing benefit artwork and gray background.
- 2026-08-17 [CODE] Now: `origin/main` commit `16f5749` is merged without commit into `codex/landing-customer-conversations`; only the continuity ledger needed reconciliation.
- 2026-08-17 [CODE] Next: validate the merged application and push the merge commit to PR #64.
- 2026-08-17 [TOOL] Existing active work: merged `main` includes PR #63’s Agent Overview topic-panel layout and donut-hover interaction.
- 2026-08-17 [ASSUMPTION] The landing update remains unshipped; its public changelog entry remains deferred until production availability is confirmed.

# Decisions
- 2026-08-17 [USER] D724 ACTIVE: hovering an overview distribution row expands its matching donut slice and renders the selected label and customer count inside the donut center.
- 2026-08-17 [USER] D720 ACTIVE: `?dummyData=true` supplies browser-only Common Topics and Customer Sentiment data in local development and must be removed before PR #63 merges.
- 2026-08-17 [USER] D701–D718 ACTIVE: Agent Overview uses the 30-day range and contextual compact controls; Q&A includes reusable support-question presets; topic analytics are plan-entitled with an upgrade path.
- 2026-08-17 [USER] D725 ACTIVE: landing benefit cards use the supplied revised portrait images above customer-outcome copy on a zinc-gray section background.
- 2026-08-16 [USER] D637–D700 ACTIVE: Google Calendar remains individual and primary-calendar-only; connected writes fail closed and manual/CSV customers retain active-agent scope.

# Done (recent)
- 2026-08-17 [CODE] Draft PR #64 presents revised landing conversation benefits with transparent portrait artwork and a zinc-gray section background; production availability is UNCONFIRMED.
- 2026-08-17 [CODE] PR #63’s Common Topics layout, hover interaction, browser-only dummy data, and centered donut-detail work merged into `main`.
- 2026-08-17 [CODE] PR #62 completed Agent Overview range controls, sample-preview upgrade actions, and Q&A presets.
- 2026-08-16 [CODE] Google Calendar booking, availability, customer scope, and remote-link milestones were deployed.

# Working set
- `src/components/landing/LandingFeatureSections.tsx`
- `src/components/landing/LandingFeatureSections.test.tsx`
- `src/components/agent-overview/AgentOverviewActiveDonutChart.tsx`
- `src/components/agent-overview/AgentOverviewTopicPanels.tsx`
- `src/components/agent-overview/AgentOverviewTopicsAndSentiment.tsx`
- `src/pages/AgentOverviewPage.tsx`
- `CONTINUITY.md`

# Receipts
- 2026-08-17 [TOOL] Fetching `origin/main` advanced it from `f531ea3` to `16f5749`; the sole merge overlap was `CONTINUITY.md`.
- 2026-08-17 [TOOL] The pending merge includes PR #63 application and planning files without application-code conflicts.
- 2026-08-17 [TOOL] The landing benefit regression passed and the Node v22.22.0 production build passed before this merge.
- 2026-08-17 [TOOL] The revised landing assets are transparent 1080×1350 PNGs.
- 2026-08-17 [TOOL] PR #64 was created from `codex/landing-customer-conversations` against `main`.
- 2026-08-17 [TOOL] PR #63’s focused tests, Node v22 TypeScript check, Vite build, and `git diff --check` passed before its merge to `main`.
