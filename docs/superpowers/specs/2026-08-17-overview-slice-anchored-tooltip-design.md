# Agent Overview Slice-Anchored Tooltip Design

## Goal

Make the active Common Topics and Customer Sentiment tooltip feel connected to its selected donut segment.

## Interaction

- Hovering a distribution-list row expands its matching donut slice by 10px.
- The tooltip is anchored immediately beyond the active slice's angular midpoint.
- Top, side, and bottom slices place the tooltip in the corresponding outward direction.
- Leaving the row removes both the expanded state and tooltip.

## Appearance

- The tooltip keeps its existing two lines: title, then customer count.
- It uses the existing background and border without a shadow.
- It ignores pointer events.

## Architecture

- The active-donut renderer calculates the tooltip anchor from Recharts' active sector `cx`, `cy`, `midAngle`, and `outerRadius` values.
- The sector renderer returns the sector plus an SVG `foreignObject` tooltip only for the active index.
- Both overview panels continue using this single renderer; shared analytics charts are unchanged.
