# Avatar Embed Format Tabs Design

## Status

Approved on 2026-07-23.

## Goal

Let customers copy a valid Avatar iframe for either plain HTML or React without
making the embed panel taller than necessary.

## Interaction

The embed panel places compact `HTML` and `React` tabs immediately above one
shared code surface. `HTML` is selected by default.

Changing tabs updates the visible snippet. It does not change the Avatar
configuration, public key, or public embed route.

The separate full-width `Copy code` button is removed. One icon-only copy
button sits inside the code surface at its top-right corner. The code surface
reserves enough right padding that snippet text cannot overlap the button.

The copy button has an accessible label matching the active format:

- `Copy HTML code`
- `Copy React code`

Successful copy feedback is also format-specific:

- `HTML code copied`
- `React code copied`

Clipboard failures continue to show `Could not copy embed code`.

## Snippet Contracts

The existing `buildAvatarEmbedSnippet(publicKey)` remains the stable HTML
builder and continues to return:

```html
<iframe src="https://kilobot.app/avatar/embed/PUBLIC_KEY" title="KiloBot Avatar" allow="microphone; autoplay" style="width:100%;aspect-ratio:16/9;border:0"></iframe>
```

A new `buildAvatarReactEmbedSnippet(publicKey)` builder returns valid JSX:

```tsx
<iframe
  src="https://kilobot.app/avatar/embed/PUBLIC_KEY"
  title="KiloBot Avatar"
  allow="microphone; autoplay"
  style={{
    width: '100%',
    aspectRatio: '16 / 9',
    border: 0,
  }}
/>
```

Both builders use the same encoded public route and
`VITE_AVATAR_EMBED_BASE_URL` behavior. Both retain microphone and autoplay
permissions and a responsive 16:9 presentation.

## Component Boundary

`src/lib/avatarEmbed.ts` owns deterministic HTML and React snippet generation.

`AvatarEmbedCard` owns the active format, tab rendering, visible snippet, and
clipboard feedback. It continues to accept only `publicKey`.

The configured Avatar page and public embed runtime remain unchanged. No
touched code file may exceed 300 lines.

## Testing

Implementation follows red-green-refactor and verifies:

- HTML remains the default format.
- Both `HTML` and `React` tabs are rendered above the code surface.
- The React builder returns JSX syntax rather than an HTML style string.
- Both snippets use the same encoded public embed route and permissions.
- The visible and copied snippet follow the active format.
- The icon-only copy button is positioned at the code surface's top-right.
- The full-width copy button is absent.
- Accessible labels and success feedback follow the active format.
- Clipboard failure feedback remains available.
- Focused tests, scoped lint, production build, whitespace checks, and
  line-limit checks pass on Node.js v22.
