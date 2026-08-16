# Overview Date Range Controls and Metric Layout

## Goal

Show the rolling last 30 days when a user opens an agent Overview page, make its top metrics more compact, and keep date controls visible with the heading.

## Behavior

- Initialize the Overview page's analytics range as `30d`.
- Use that range for both summary metrics and credit-usage data.
- Keep Billing period and the other time ranges selectable after the page loads.
- Leave dedicated usage pages unchanged.
- Display the active date range beneath the Overview title with persistent Billing period, 7d, 30d, and 90d buttons beside it.
- Remove the Overview time-range dropdown from the selected trend chart.
- Keep the displayed date range read-only; do not offer a custom date picker or arbitrary From/To ranges.
- Rename the AI-assisted conversation metric and selected chart label to `AI conversations`.
- Keep the metric cards selectable, but remove their decorative mini trend graphs.
- Display each metric label above its value and reduce the card height.
- Reduce the main Overview trend chart height from 497px to 400px so it is visible sooner below the metrics.

## Testing

- Add focused regression tests that assert the Overview initializes its range as `30d`, renders visible range shortcuts beside the date, uses the shortened AI label, removes metric previews, and uses the compact main chart height.
