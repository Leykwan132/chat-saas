# Web Widget Controls and WhatsApp Ready State Design

## Goal

Make Web Widget configuration predictable and prevent inactive-mode preview crashes, while removing the completed progress bar from ready WhatsApp channel cards.

## Scope

- Add an explicit save action for the Traditional widget pill label and WhatsApp prefilled message.
- Separate saving configuration from publishing a widget mode.
- Keep AI preview queries and sends disabled while Traditional mode is active.
- Default the setup dialog to Traditional without changing the currently active public mode.
- Hide WhatsApp sync progress whenever the card presents the completed `Ready` state.
- Preserve progress during requested and syncing states that are still presented as in progress.

## Web Widget Interaction

The Traditional panel will expose two distinct actions:

- `Save changes` persists the trimmed pill label, trimmed prefilled message, and branding preference without changing the public widget mode.
- `Set as active widget` explicitly activates Traditional mode. It is unavailable while the form is invalid, while changes are unsaved, while a request is pending, or when Traditional is already active.

Copying or downloading the installation snippet will only copy or download. Those actions will no longer save settings or activate Traditional mode as a hidden side effect.

The AI-powered panel will expose `Set as active widget` when Traditional is active. Activating AI mode uses the existing `activateMode` mutation. While AI is inactive, its visual configuration remains viewable, but the live conversation query and message mutation remain disabled. The UI explains that AI must be activated to use the live preview.

The dialog will initially select Traditional whenever setup opens. This changes only the visible configuration tab; the saved active mode remains the public widget mode until the user explicitly activates another mode.

## State and Data Flow

No schema changes or new Convex functions are required.

- `updateTraditionalSettings` remains responsible only for persistence.
- `activateMode` remains responsible only for publishing the selected mode.
- The Traditional panel tracks local drafts and compares their normalized values with reactive settings to derive dirty state.
- The AI preview receives an explicit enabled state. Disabled previews pass `"skip"` to the reactive message query and never invoke `publicReceiveMessage`.
- Successful mutations use existing reactive settings to refresh active mode and saved values.

## Validation and Feedback

- Pill labels remain 1–40 trimmed characters.
- Prefilled messages remain 1–500 trimmed characters.
- Save and activation controls disable during requests and when their preconditions are not met.
- Successful saves and activations produce distinct toasts.
- Existing mutation errors continue to appear through error toasts.

## WhatsApp Ready Card

The channel card will treat the displayed ready state as terminal for progress presentation. If `getWhatsAppSyncStatus` returns `showCheck: true`, the progress bar is omitted even when a secondary contact-sync field still says `requested` or `syncing`. Non-ready syncing labels continue to show their current percentage or pulsing progress treatment.

## Testing

- Add a regression test proving an inactive AI preview skips its Convex query and cannot send messages.
- Add UI coverage for Traditional save and explicit activation controls, including removal of installation side effects.
- Add coverage that the dialog defaults to Traditional.
- Add a WhatsApp status regression test proving `Ready` suppresses progress while genuine syncing states retain it.
- Run the focused Vitest suites, scoped lint or TypeScript checks as appropriate, the production build under Node 22, and whitespace checks.

## Release Handling

The changes are customer-facing but remain unreleased until production availability is confirmed. Record the completed local work in `CONTINUITY.md`; do not add a changelog entry before release confirmation.
