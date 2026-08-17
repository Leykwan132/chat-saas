# CONTINUITY.md

# Snapshot
- 2026-08-18 [USER] Goal: measure every unauthenticated “Start for free” CTA with the supplied Google Ads sign-up conversion and open a review PR.
- 2026-08-18 [CODE] Now: branch `codex/google-ads-signup-conversion` contains the approved design, shared conversion helper, base Google tag, and four public CTA handler integrations.
- 2026-08-18 [CODE] Next: push the branch and open the draft PR; production availability is UNCONFIRMED.
- 2026-08-18 [ASSUMPTION] Do not add a public changelog entry until this unshipped conversion-tracking change is confirmed in production.

# Decisions
- 2026-08-17 [USER] D724 ACTIVE: hovering an overview distribution row expands its matching donut slice and renders the selected label and customer count inside the donut center.
- 2026-08-17 [USER] D720 ACTIVE: `?dummyData=true` supplies browser-only Common Topics and Customer Sentiment data in local development and must be removed before PR #63 merges.
- 2026-08-17 [USER] D701–D718 ACTIVE: Agent Overview uses the 30-day range and contextual compact controls; Q&A includes reusable support-question presets; topic analytics are plan-entitled with an upgrade path.
- 2026-08-17 [USER] D725 ACTIVE: landing benefit cards use the supplied revised portrait images at full grid-column width above customer-outcome copy on a zinc-gray section background; the booking card retains “Turn Enquiries Into Bookings” and makes KiloBot’s booking lifecycle automation explicit.
- 2026-08-16 [USER] D637–D700 ACTIVE: Google Calendar remains individual and primary-calendar-only; connected writes fail closed and manual/CSV customers retain active-agent scope.

# Done (recent)
- 2026-08-18 [CODE] Google Ads conversion tracking now covers landing, shared header, blog-layout, and legal-layout “Start for free” actions while preserving WorkOS and PostHog behavior.
- 2026-08-18 [CODE] Approved design and implementation plans are committed as `323bc97` and `a0d46c3`; production implementation is committed as `6c5877f` and `9baa7ca`.
- 2026-08-18 [TOOL] Focused conversion, landing, and header tests pass: 8 tests across 3 files.
- 2026-08-17 [CODE] Draft PR #64 presents revised landing conversation benefits with transparent portrait artwork filling each grid column and a zinc-gray section background; production availability is UNCONFIRMED.
- 2026-08-17 [CODE] PR #63’s Common Topics layout, hover interaction, browser-only dummy data, and centered donut-detail work merged into `main`.
- 2026-08-17 [CODE] PR #62 completed Agent Overview range controls, sample-preview upgrade actions, and Q&A presets.
- 2026-08-16 [CODE] Google Calendar booking, availability, customer scope, and remote-link milestones were deployed.

# Working set
- 2026-08-18 [CODE] `index.html`
- 2026-08-18 [CODE] `src/lib/googleAdsConversion.ts`
- 2026-08-18 [CODE] `src/lib/googleAdsConversion.test.ts`
- 2026-08-18 [CODE] `src/pages/LandingPage.tsx`
- 2026-08-18 [CODE] `src/pages/LandingPage.test.ts`
- 2026-08-18 [CODE] `src/components/SiteHeader.tsx`
- 2026-08-18 [CODE] `src/components/SiteHeader.test.ts`
- 2026-08-18 [CODE] `src/components/BlogPostLayout.tsx`
- 2026-08-18 [CODE] `src/components/LegalDocumentLayout.tsx`
- 2026-08-18 [CODE] `CONTINUITY.md`

# Receipts
- 2026-08-18 [TOOL] `bun run test` used the repository-defined Vitest/documentation test script: 477 test files passed and 18 pre-existing Convex/calendar/sidebar tests failed outside this change.
- 2026-08-18 [TOOL] Node v22.22.0 `bun run build` passed with exit code 0; existing Vite warnings reported an unset Meta app ID and large chunks.
- 2026-08-18 [TOOL] `git diff --check` passed and the branch diff contains only the approved design/plan, Google Ads bootstrap/helper, CTA integrations, and focused tests.
- 2026-08-18 [TOOL] `bun install --frozen-lockfile` restored missing local dependencies without changing tracked lockfiles.
- 2026-08-17 [TOOL] Fetching `origin/main` advanced it from `f531ea3` to `16f5749`; the sole merge overlap was `CONTINUITY.md`.
- 2026-08-17 [TOOL] The pending merge includes PR #63 application and planning files without application-code conflicts.
- 2026-08-17 [TOOL] The landing benefit regression passed and the Node v22.22.0 production build passed before this merge.
- 2026-08-17 [TOOL] The revised landing assets are transparent 1080×1350 PNGs.
- 2026-08-17 [TOOL] PR #64 was created from `codex/landing-customer-conversations` against `main`.
- 2026-08-17 [TOOL] PR #63’s focused tests, Node v22 TypeScript check, Vite build, and `git diff --check` passed before its merge to `main`.
- 2026-08-17 [TOOL] PR #64 merge resolution passed 13 focused landing-and-overview tests, the Node v22.22.0 production build, and `git diff --check`; `origin/main` is an ancestor of the branch.
- 2026-08-17 [TOOL] The landing full-width regression failed against the 320px cap, then passed with the Node v22.22.0 production build and `git diff --check`.
- 2026-08-17 [TOOL] The booking-copy regression failed before the AI-led lifecycle wording was implemented, then passed with the Node v22.22.0 production build and `git diff --check`.
