# CONTINUITY.md

# Snapshot
- 2026-08-18 [USER] Goal: remove app-triggered Google Ads conversion events; Google manages conversion measurement from onboarding entry.
- 2026-08-18 [CODE] Now: the CTA conversion helper, callbacks, obsolete tests, and obsolete implementation docs are removed; the base Google tag remains in `index.html`.
- 2026-08-18 [CODE] Next: push the verified update to PR #66 and refresh its description if GitHub write access is available.
- 2026-08-18 [ASSUMPTION] The customer-facing conversion-tracking change remains unshipped; do not add a release changelog entry until production availability is confirmed.

# Decisions
- 2026-08-18 [USER] D727 ACTIVE: the app does not send Google Ads conversion events; the installed Google tag measures the configured onboarding conversion.
- 2026-08-18 [USER] D726 SUPERSEDED by D727: unauthenticated “Start for free” CTAs no longer use an app conversion helper.
- 2026-08-17 [USER] D724 ACTIVE: hovering an overview distribution row expands its matching donut slice and renders the selected label and customer count inside the donut center.
- 2026-08-17 [USER] D720 ACTIVE: `?dummyData=true` supplies browser-only Common Topics and Customer Sentiment data in local development and must be removed before PR #63 merges.
- 2026-08-17 [USER] D701–D718 ACTIVE: Agent Overview uses the 30-day range and contextual compact controls; Q&A includes reusable support-question presets; topic analytics are plan-entitled with an upgrade path.
- 2026-08-17 [USER] D725 ACTIVE: landing benefit cards use the supplied revised portrait images at full grid-column width above customer-outcome copy on a zinc-gray section background; the booking card retains “Turn Enquiries Into Bookings” and makes KiloBot’s booking lifecycle automation explicit.
- 2026-08-16 [USER] D637–D700 ACTIVE: Google Calendar remains individual and primary-calendar-only; connected writes fail closed and manual/CSV customers retain active-agent scope.

# Done (recent)
- 2026-08-18 [CODE] Removed the custom CTA conversion helper and all four public CTA calls; WorkOS sign-up now starts immediately while the Google tag remains installed.
- 2026-08-18 [CODE] Removed the obsolete helper test and implementation design/plan documentation; retained the incoming global-tag loader test.
- 2026-08-18 [TOOL] Focused landing/header regression tests pass: 7 tests across 2 files; the loader test passes; the Node 22 production build passed.
- 2026-08-18 [CODE] `origin/main` includes PR #65’s Google Ads base tag and loader test; those changes are retained in this merge.
- 2026-08-17 [CODE] PR #63’s Common Topics layout, hover interaction, browser-only dummy data, and centered donut-detail work merged into `main`.
- 2026-08-16 [CODE] Google Calendar booking, availability, customer scope, and remote-link milestones were deployed.

# Working set
- 2026-08-18 [CODE] `index.html`
- 2026-08-18 [CODE] `src/googleAdsTag.test.mjs`
- 2026-08-18 [CODE] `src/pages/LandingPage.tsx`
- 2026-08-18 [CODE] `src/pages/LandingPage.test.ts`
- 2026-08-18 [CODE] `src/components/SiteHeader.tsx`
- 2026-08-18 [CODE] `src/components/SiteHeader.test.ts`
- 2026-08-18 [CODE] `src/components/BlogPostLayout.tsx`
- 2026-08-18 [CODE] `src/components/LegalDocumentLayout.tsx`
- 2026-08-18 [CODE] `CONTINUITY.md`

# Receipts
- 2026-08-18 [TOOL] The regression test failed before removal because all CTA owners still called `reportGoogleAdsConversion`; it passed after the helper and calls were removed.
- 2026-08-18 [TOOL] Node v22.22.0 `bun run build` passed after the removal, with only the existing unset Meta app ID and large-chunk Vite warnings.
- 2026-08-18 [TOOL] `git fetch origin main` advanced `origin/main` from `ea09604` to `ddb1a1c`; merge conflicts in `CONTINUITY.md` and `index.html` were resolved in `fdcd68e`.
- 2026-08-18 [TOOL] The incoming `src/googleAdsTag.test.mjs` verifies the Google Ads loader URL and config ID and is retained.
- 2026-08-18 [TOOL] PR #66 is open at `https://github.com/Leykwan132/chat-saas/pull/66`; GitHub search succeeded, but PR description updates return 403 and local `gh` authentication remains invalid.
- 2026-08-18 [TOOL] `bun run test` previously reported 477 test files passed and 18 unrelated pre-existing Convex/calendar/sidebar failures outside this change.
- 2026-08-18 [TOOL] Node v22.22.0 `bun run build` previously passed with exit code 0; existing Vite warnings reported an unset Meta app ID and large chunks.
- 2026-08-18 [TOOL] The branch was pushed to `origin`; earlier PR creation was blocked by GitHub connector 403 and invalid local `gh` authentication.
- 2026-08-17 [TOOL] PR #64 merge resolution passed focused landing-and-overview tests, the Node v22.22.0 production build, and `git diff --check`.
