# Agent Overview Active Donut Details Design

## Goal

Make the hovered Common Topics and Customer Sentiment rows easier to read by showing the matching label and customer count in the center of its donut chart.

## Interaction

- Hovering a Common Topics row expands its matching donut sector and displays the topic label above its customer count in the donut center.
- Hovering a Customer Sentiment row provides the same sector expansion and two-line center detail.
- Leaving a row clears its active sector and center detail.
- The center label wraps within the donut hole rather than truncating a topic title.

## Layout

- Both panels retain the existing 340px minimum shell height so topic rows can grow the card when necessary.
- The analytics shell owns the panel's bottom padding. The inner panel grid does not add duplicate bottom padding.

## Scope

- Use an Agent Overview-specific reusable donut renderer so shared analytics charts do not gain a new interaction contract.
- Keep the existing hover tooltip for direct chart interaction.
- Preserve the browser-only `?dummyData=true` mode and remove it before merging PR #63.
