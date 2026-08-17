# Agent Overview Centered Donut Details Design

## Goal

Show the active Common Topics or Customer Sentiment detail inside the donut center instead of in a floating tooltip.

## Interaction

- Hovering a distribution-list row expands its matching donut slice by 10px.
- The donut hole displays the active label on its first line and customer count on its second line.
- Leaving the row clears the center detail.
- Direct slice hover retains the existing chart tooltip.

## Layout

- The center detail is pointer-transparent and constrained to the donut hole, wrapping long topic titles.
- No floating tooltip, SVG `foreignObject`, radial positioning, or shadow remains.
- Common Topics and Customer Sentiment continue using the shared Agent Overview renderer.
