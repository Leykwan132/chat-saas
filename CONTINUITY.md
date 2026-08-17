# CONTINUITY.md

# Snapshot
- 2026-08-18 [USER] Goal: merge the latest `origin/main` into the Google Ads sign-up conversion branch, resolve conflicts, and update its PR description.
- 2026-08-18 [CODE] Now: merge commit `fdcd68e` incorporates `origin/main` at `ddb1a1c`; `CONTINUITY.md` and `index.html` conflicts are resolved and PR #66 is pushed.
- 2026-08-18 [CODE] Next: update PR #66’s description after GitHub write access is restored.
- 2026-08-18 [ASSUMPTION] The customer-facing conversion tracking remains unshipped; do not add a release changelog entry until production availability is confirmed.

# Decisions
- 2026-08-18 [USER] D726 ACTIVE: every unauthenticated “Start for free” CTA uses one Google Ads conversion helper before the existing WorkOS sign-up action.
- 2026-08-17 [USER] D724 ACTIVE: hovering an overview distribution row expands its matching donut slice and renders the selected label and customer count inside the donut center.
- 2026-08-17 [USER] D720 ACTIVE: `?dummyData=true` supplies browser-only Common Topics and Customer Sentiment data in local development and must be removed before PR #63 merges.
- 2026-08-17 [USER] D701–D718 ACTIVE: Agent Overview uses the 30-day range and contextual compact controls; Q&A includes reusable support-question presets; topic analytics are plan-entitled with an upgrade path.
- 2026-08-17 [USER] D725 ACTIVE: landing benefit cards use the supplied revised portrait images at full grid-column width above customer-outcome copy on a zinc-gray section background; the booking card retains “Turn Enquiries Into Bookings” and makes KiloBot’s booking lifecycle automation explicit.
- 2026-08-16 [USER] D637–D700 ACTIVE: Google Calendar remains individual and primary-calendar-only; connected writes fail closed and manual/CSV customers retain active-agent scope.

# Done (recent)
- 2026-08-18 [CODE] Google Ads conversion tracking covers landing, shared header, blog-layout, and legal-layout “Start for free” actions while preserving WorkOS and PostHog behavior.
- 2026-08-18 [CODE] The design, implementation plan, helper, CTA wiring, continuity ledger, and incoming `src/googleAdsTag.test.mjs` are committed on the branch.
- 2026-08-18 [TOOL] Focused conversion, landing, and header tests pass: 8 tests across 3 files; the loader test passes; the Node 22 production build passed after the merge.
- 2026-08-18 [CODE] `origin/main` includes PR #65’s Google Ads base tag and loader test; those changes are retained in this merge.
- 2026-08-17 [CODE] PR #63’s Common Topics layout, hover interaction, browser-only dummy data, and centered donut-detail work merged into `main`.
- 2026-08-16 [CODE] Google Calendar booking, availability, customer scope, and remote-link milestones were deployed.

# Working set
- 2026-08-18 [CODE] `index.html`
- 2026-08-18 [CODE] `src/googleAdsTag.test.mjs`
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
- 2026-08-18 [TOOL] `git fetch origin main` advanced `origin/main` from `ea09604` to `ddb1a1c`; merge conflicts in `CONTINUITY.md` and `index.html` were resolved in `fdcd68e`.
- 2026-08-18 [TOOL] The incoming `src/googleAdsTag.test.mjs` verifies the Google Ads loader URL and config ID and is retained.
- 2026-08-18 [TOOL] PR #66 is open at `https://github.com/Leykwan132/chat-saas/pull/66`; GitHub search succeeded, but PR description updates return 403 and local `gh` authentication remains invalid.
- 2026-08-18 [TOOL] `bun run test` previously reported 477 test files passed and 18 unrelated pre-existing Convex/calendar/sidebar failures outside this change.
- 2026-08-18 [TOOL] Node v22.22.0 `bun run build` previously passed with exit code 0; existing Vite warnings reported an unset Meta app ID and large chunks.
- 2026-08-18 [TOOL] The branch was pushed to `origin`; earlier PR creation was blocked by GitHub connector 403 and invalid local `gh` authentication.
- 2026-08-17 [TOOL] PR #64 merge resolution passed focused landing-and-overview tests, the Node v22.22.0 production build, and `git diff --check`.
