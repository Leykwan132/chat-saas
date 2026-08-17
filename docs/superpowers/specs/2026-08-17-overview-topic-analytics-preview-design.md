# Overview Topic Analytics Preview

## Goal

Restrict live Common Topics and Customer Sentiment analytics to Growth and Business, while letting Free and Starter users explore an explicitly labelled sample preview and open the existing upgrade flow.

## Entitlement and Data

- Reuse the existing `topic_analytics` feature flag. It is false for Free and Starter, and true for Growth and Business.
- Enforce the entitlement in the Agent Overview summary query. A caller without `topic_analytics` receives no live trending-topic rows or live sentiment counts.
- Return one `topicAnalyticsEnabled` boolean with the summary response so the page can render the correct panel state without an extra plan query.
- Keep metrics and the main trend chart available exactly as they are today.

## Locked Panels

- For Free and Starter, show the current Common Topics and Customer Sentiment panels in a locked state rather than their empty states or live data.
- Hovering either locked panel reveals two actions: `Preview` and `Upgrade`.
- `Upgrade` opens the existing upgrade modal, which already selects the right Free-to-Starter or Starter-to-Growth scenario.
- `Preview` switches both lower panels to the same static sample dataset. It does not request, mix with, or persist customer data.

## Preview Content

- The preview uses fixed topic counts and sentiment counts defined locally in the Overview UI.
- Both panel titles show a `Sample data` badge while preview is active.
- A short visible note states: `Sample data — not from your conversations.`
- The sample data remains visible for the current page visit. Reloading or navigating away returns Free and Starter users to the locked state.

## Testing

- Add backend coverage that verifies a plan without `topic_analytics` receives no live topic or sentiment analytics, while an entitled plan receives them.
- Add panel coverage for locked controls, the preview disclosure, sample panel data, and the Upgrade action.
- Preserve current live-data rendering for Growth and Business.
