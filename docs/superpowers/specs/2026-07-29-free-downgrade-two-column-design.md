# Free Downgrade Two-Column Warning

## Goal

Make the paid-to-Free confirmation easier to scan without weakening the permanent-deletion warning.

## Layout

- Widen the dialog enough to display its two impact sections side by side on medium and larger screens.
- Place “What you’ll lose” in the left column.
- Place “What will be removed” in the right column.
- Stack the sections vertically on narrow screens so titles and descriptions remain readable.
- Use a 40px gap between columns.
- Use 16px between each impact row and between each section title and its rows.
- Use 24px between the dialog header, impact grid, and footer.
- Keep the existing viewport-height limit and scrolling behavior.

## Copy

Replace the current description with:

> Free keeps only your Personal workspace. Everything in your other workspaces will be permanently deleted.

Retain the existing six short title-and-description rows in each section and the existing actions.

## Behavior

This is a presentation-only change. It does not alter plan selection, Stripe navigation, cleanup behavior, loading state, or dismissal behavior.

## Verification

- Add a regression assertion for the shortened warning.
- Add a source-level layout assertion for responsive two-column behavior.
- Run the focused downgrade-warning and plan-selection tests.
- Run the production build.
