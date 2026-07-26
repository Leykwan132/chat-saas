# Referral Page Borderless Layout Design

## Goal

Replace the referral page's repeated framed containers with a compact flat layout modeled on the supplied invite-page reference.

## Layout

The page header remains unchanged. Beneath it, one rounded semantic background groups the primary referral content and provides a future surface for user-supplied media. It contains “How it works” first as three short icon-and-text rows.

“Your referral code” follows inside the same surface. The referral code sits alone in one input-like field beside a separate text Copy button with exactly the same height. No link icon or referral-count metadata appears.

“Past referrals” sits below at full width. It has no enclosing card. Populated history uses the existing table and row separators, while its zero state uses a soft semantic background.

## Constraints

- Preserve all referral queries, pagination, copying, capped-state behavior, and dynamic credit copy.
- Use existing semantic colors and shadcn components.
- Do not change shared UI primitives.
- Keep the page responsive and under the 300-line code limit.
- Keep the feature unreleased.

## Verification

A focused structural test verifies the grouped background, flat section order, lack of Card/Progress/link presentation, equal-height code and Copy controls, absence of referral-count metadata, plain history section, and soft zero-state background. The existing referral and application tests must continue to pass.
