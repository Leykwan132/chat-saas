# Channel Status and Guide Cleanup Design

## Goal

Make the Channels page more direct, give connected Messenger and Instagram cards the same clear completion signal as WhatsApp, remove book-style guide sections outside Follow-ups, and simplify Broadcast's missing-channel action.

## Channels

The page header remains unchanged. The channel-card grid follows it directly, without a Guides section, an Available channels heading, or the heading divider.

The How channels work and Mobile coexistence triggers, dialog state, dialog rendering, and private dialog implementations are removed. No replacement guide entry is added.

Connected Messenger and Instagram cards render the existing circular emerald check immediately before their saved-conversation label. The status appears for every non-negative displayed count, including `0 conversations saved`. WhatsApp continues to use the identical visual treatment for its ready state.

The status indicator becomes a small shared channel component so WhatsApp, Messenger, and Instagram cannot drift into separate icon implementations.

## Guide sections

The book-style Guides sections are removed from Broadcast and Services. Their state, imports, dialogs, and components are removed from those pages when they become unreachable.

The Follow-ups Guides section remains unchanged, including its overview and calculator books.

Other product guidance surfaces that are not page-level book sections, such as Launch Guide, Knowledge Base navigation, support links, and workflow content, remain unchanged.

## Broadcast missing-channel state

Broadcast continues to use the shared WhatsApp feature gate, with a Broadcast-specific presentation option. Its WhatsApp icon is displayed directly without a bordered or tinted container. The primary action reads `Connect Channel` and uses a plus icon instead of the WhatsApp logo.

Follow-ups and Message Templates retain their current missing-channel presentation.

## Local preview

A temporary local preview will render connected Messenger and Instagram cards, including a zero-count example, and the Broadcast missing-channel state. Preview data must stay in local UI tooling and must not be written to Convex. Temporary preview scaffolding will not remain in production code.

## Testing

Tests are written before production changes and must prove:

- the shared ready status renders the circular emerald check and supplied label;
- Messenger and Instagram saved-count presentation uses the shared status, including zero;
- Channels no longer renders guide books, guide dialogs, or the Available channels heading;
- Broadcast and Services no longer render book-style Guides sections;
- Follow-ups retains its Guides section;
- Broadcast requests the minimal missing-channel presentation with `Connect Channel` and a plus icon while other feature-gate consumers remain unchanged.

Focused tests, scoped lint, a proportionate TypeScript/build check, and whitespace validation must pass under Node 22. Existing unrelated worktree changes must be preserved.

## Release handling

This is a confirmed local customer-facing change but is not confirmed available in production. Record it in `CONTINUITY.md`; do not add a public changelog entry until production availability is confirmed.
