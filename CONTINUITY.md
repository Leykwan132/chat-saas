# CONTINUITY.md

# Snapshot
- 2026-08-17 [USER] Goal: replace the landing-page sales-feature cards with the supplied portrait conversation images, image-first layout, and customer-conversation messaging; open a PR for review.
- 2026-08-17 [CODE] Now: `codex/landing-customer-conversations` contains the isolated landing-section change and regression test; it awaits commit and draft PR creation.
- 2026-08-17 [CODE] Next: publish the review PR; do not add a changelog entry until production availability is confirmed.
- 2026-08-17 [TOOL] Existing active work: PR #62 tracks Agent Overview date controls and Q&A preset improvements.
- 2026-08-17 [ASSUMPTION] The new section title is “Built for real customer conversations,” chosen to frame the three customer outcomes without repeating the hero’s sales framing.

# Decisions
- 2026-08-17 [USER] D701–D718 ACTIVE: Agent Overview defaults to a 30-day range, uses compact controls and contextual graph copy, and limits live topic analytics to entitled plans with an in-panel upgrade path.
- 2026-08-17 [USER] D716 ACTIVE: Knowledge Base Q&A exposes five reusable customer-support question presets.
- 2026-08-16 [USER] D637–D700 ACTIVE: Google Calendar is individual and primary-calendar-only; connected Google writes fail closed, Meet requires eligible healthy synchronization, and manual/CSV customers retain active-agent scope.
- 2026-08-17 [USER] D719 ACTIVE: landing benefit cards present portrait images above their copy on the page background, using customer-outcome content rather than product-module labels.

# Done (recent)
- 2026-08-17 [CODE] Prepared the landing conversation-benefits redesign with supplied answer, customization, and booking imagery; production availability is UNCONFIRMED.
- 2026-08-17 [CODE] Overview range controls and analytics sample-preview upgrade actions were completed on PR #62.
- 2026-08-17 [CODE] Knowledge Base Q&A presets were completed on PR #62.
- 2026-08-16 [CODE] Google Calendar booking, availability, customer scope, and remote-link milestones were deployed.

# Working set
- `src/components/landing/LandingFeatureSections.tsx`
- `src/components/landing/LandingFeatureSections.test.tsx`
- `CONTINUITY.md`

# Receipts
- 2026-08-17 [TOOL] The new landing-section regression test failed as expected before implementation because the replacement title and portrait cards were absent.
- 2026-08-17 [TOOL] The focused landing-section regression test passed under Node v22.22.0 after implementation.
- 2026-08-17 [TOOL] The Node v22.22.0 production build and `git diff --check` passed after the landing-section change.
- 2026-08-17 [TOOL] Verified the three supplied remote assets are transparent 1080×1350 PNGs.
- 2026-08-17 [TOOL] Local review branch `codex/landing-customer-conversations` was created from the detached checkout.
- 2026-08-17 [TOOL] PR #62 remains the existing draft for Agent Overview and Q&A work.
