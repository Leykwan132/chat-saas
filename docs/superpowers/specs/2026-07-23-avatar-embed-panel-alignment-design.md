# Avatar Embed Panel Alignment Design

## Status

Approved on 2026-07-23 from the supplied Avatar home-page screenshot.

## Goal

Align the `Preview` and `Embed on your website` headings at the top of their
desktop columns without changing the responsive layout or embed behavior.

## Design

Remove the embed panel's outer border, card background, rounded container, and
padding. The embed content remains a vertical stack in the existing bounded
right grid column.

The heading, description, muted code surface, and outlined `Copy code` button
remain unchanged. On narrow screens, the borderless embed content continues to
stack below the preview.

Compensating margins are excluded because they would encode the old card
padding into the page layout. Moving both headings into a shared row is
excluded because it complicates the existing responsive stacking order.

## Testing

The embed-panel source contract verifies that the section retains its
min-width and vertical layout classes but does not use the outer `rounded-xl`,
`border`, `bg-card`, or `p-5` classes.

Focused Avatar embed-card and configured-page tests, scoped lint, whitespace,
and line-limit checks must pass on Node.js v22.
