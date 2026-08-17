# Overview Range Loading and Control Polish

## Goal

Keep the Agent Overview stable while a newly selected date range loads, and make the header controls easier to read and use.

## Behavior

- On the first visit, retain the existing full-page Overview skeleton until both analytics queries resolve.
- When the user selects 1d, 7d, 30d, or 90d after the first successful load, retain the last completed metrics, chart, topics, sentiment, and period label until the replacement responses arrive.
- Mark the date-range control group as busy while replacement results are pending, without disabling it. The user may choose another range while a previous request is in flight.
- Replace all retained data together only when both summary and credit-usage responses for the selected range are available.
- Switching Daily and Cumulative is a local chart transformation and must update without any skeleton or busy state.
- Give each range button a top-positioned tooltip: `Last day`, `Last 7 days`, `Last 30 days`, and `Last 90 days`.
- Style the Overview Daily/Cumulative trigger as a fully rounded 32px pill with the same `text-sm` type scale as the date-range buttons. Do not change shared Select styling or other pages.

## Testing

- Add focused coverage for the range-button tooltip labels and the rounded Daily/Cumulative trigger classes.
- Add focused coverage that the first load still renders the full skeleton, while a later range change retains the resolved Overview content and marks the range controls busy.
- Verify Daily/Cumulative changes do not enter the busy state.
