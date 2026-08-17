# CONTINUITY.md

# Snapshot
- 2026-08-18 [USER] Goal: remove app-triggered Google Ads conversion events; Google manages conversion measurement from the configured onboarding entry.
- 2026-08-18 [CODE] Now: merge conflicts with the already-merged conversion implementation are resolved in favor of removing the helper and CTA callbacks; verification passes and the base tag remains in `index.html`.
- 2026-08-18 [CODE] Next: open the follow-up review PR after GitHub authentication is restored.
- 2026-08-18 [ASSUMPTION] The removal is unshipped; do not add a release changelog entry until production availability is confirmed.

# Decisions
- 2026-08-18 [USER] D727 ACTIVE: the app does not send Google Ads conversion events; the installed Google tag measures the configured onboarding conversion.
- 2026-08-18 [USER] D726 SUPERSEDED by D727: unauthenticated “Start for free” CTAs do not use an app conversion helper.
- 2026-08-17 [USER] D724 ACTIVE: hovering an overview distribution row expands its matching donut slice and renders the selected label and customer count inside the donut center.
- 2026-08-17 [USER] D720 ACTIVE: `?dummyData=true` supplies browser-only Common Topics and Customer Sentiment data in local development and must be removed before PR #63 merges.
- 2026-08-17 [USER] D701–D718 ACTIVE: Agent Overview uses the 30-day range and contextual compact controls; Q&A includes reusable support-question presets; topic analytics are plan-entitled with an upgrade path.
- 2026-08-17 [USER] D725 ACTIVE: landing benefit cards use the supplied revised portrait images at full grid-column width above customer-outcome copy on a zinc-gray section background; the booking card retains “Turn Enquiries Into Bookings” and makes KiloBot’s booking lifecycle automation explicit.
- 2026-08-16 [USER] D637–D700 ACTIVE: Google Calendar remains individual and primary-calendar-only; connected writes fail closed and manual/CSV customers retain active-agent scope.

# Done (recent)
- 2026-08-18 [CODE] Removed the custom CTA conversion helper and all four public CTA calls; WorkOS sign-up starts immediately while the Google tag remains installed.
- 2026-08-18 [CODE] Removed the obsolete helper test and implementation design/plan documentation; retained the incoming global-tag loader test.
- 2026-08-18 [TOOL] Focused landing/header regression tests pass: 7 tests across 2 files; the loader test passes; the Node 22 production build passed after resolving latest `origin/main`.
- 2026-08-18 [CODE] `origin/main` includes merged PR #66’s prior conversion implementation; this follow-up removes it.
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
- 2026-08-18 [TOOL] Node v22.22.0 `bun run build` passed after the removal, with only existing unset Meta app ID and large-chunk Vite warnings.
- 2026-08-18 [TOOL] `origin/main` at `32a2ebe` contains merged PR #66; the removal branch is resolving that merge in favor of D727.
- 2026-08-18 [TOOL] Post-merge focused Vitest checks (7), loader test (1), and Node v22.22.0 production build passed; only existing Meta app ID and large-chunk Vite warnings remain.
- 2026-08-18 [TOOL] The incoming `src/googleAdsTag.test.mjs` verifies the Google Ads loader URL and config ID and remains intact.
- 2026-08-18 [TOOL] Local `gh` authentication is invalid and GitHub connector writes previously returned 403; follow-up PR creation will be retried after pushing.
- 2026-08-18 [TOOL] Follow-up branch `codex/google-ads-signup-conversion` was pushed at `0c1daac`; GitHub connector PR creation returned an internal error and `gh auth status` confirms its token is invalid.
- 2026-08-17 [TOOL] PR #64 merge resolution passed focused landing-and-overview tests, the Node v22.22.0 production build, and `git diff --check`.
