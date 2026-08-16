# Overview Last 30 Days Default

## Goal

Show the rolling last 30 days when a user opens an agent Overview page.

## Behavior

- Initialize the Overview page's analytics range as `30d`.
- Use that range for both summary metrics and credit-usage data.
- Keep Billing period and the other time ranges selectable after the page loads.
- Leave dedicated usage pages unchanged.

## Testing

- Add a focused page-source regression test that asserts Overview initializes its range as `30d`.
