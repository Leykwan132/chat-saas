# Playground Response Expansion Design

## Goal

Let a Playground user open a completed assistant response in a tall, focused reading view.

## Interaction

Each completed assistant response is keyboard-accessible and can be clicked. The click opens a dialog that uses the available viewport height, with the response body scrolling inside it. Streaming and pending responses remain static so an in-progress answer cannot be opened as stale content.

## Structure

`TestChatWindow` owns the selected response state. A small presentational dialog component receives the response title, open state, and response content. The existing markdown and citation rendering are reused inside the dialog, so the expanded view remains visually and semantically consistent with the chat bubble.

## Verification

Render the dialog with real React server rendering and assert that its visible title and viewport-filling, scrollable response region are present. Verify the Playground's focused test file and production build.
