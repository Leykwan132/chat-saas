# Agent Overview Active Donut Tooltip Design

## Goal

Replace the active donut's center label with an easy-to-scan tooltip above the chart for Common Topics and Customer Sentiment.

## Interaction

- Hovering a distribution-list row expands the matching donut slice by 10px.
- The same hover state displays one tooltip above that donut.
- The tooltip shows the selected label on its first line and its formatted customer count on its second line.
- Leaving the row clears the active slice and hides the tooltip.
- The tooltip does not appear when no list row is active.

## Layout

- The tooltip is horizontally centered above the donut and does not intercept pointer events.
- The donut hole remains empty.
- Both chart panels retain their current compact lower spacing.

## Scope

- Keep the interaction scoped to the Agent Overview active-donut renderer.
- Do not alter the shared analytics customer-sentiment chart.
- Preserve direct chart-slice tooltips and browser-only `?dummyData=true` testing data.
