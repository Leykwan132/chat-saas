# Reminder Notice Background Design

## Goal

Give the reminder eligibility notice a white surface in light mode while preserving theme compatibility.

## Design

- Replace the notice callout's `bg-muted/50` background with the semantic `bg-background` token.
- Keep the existing dashed border, radius, spacing, `Info` icon, muted text, copy, and placement unchanged.
- Let `bg-background` follow the active theme rather than forcing literal white in dark mode.

## Scope

This is a styling-only change in `WorkflowReminderSummaryNode`. Reminder configuration, summary content, accessibility, persistence, and backend behavior remain unchanged.

## Verification

- Extend the focused reminder notice placement test to require `bg-background` and reject `bg-muted/50` on the callout.
- Run the focused test under Node 22.
- Run targeted lint, `git diff --check`, and the touched-code line-count check.
