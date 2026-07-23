# Avatar Embed Preview Parity Design

## Goal

Make the public Avatar iframe use the same visual stage and controls as the
configured dashboard preview.

## Current Problem

The dashboard preview renders `AvatarVideoStage`, but `/avatar/embed/:publicKey`
renders a separate full-screen black interface with a centered “Talk with
KiloBot” card and a `Start conversation` button. This duplicate presentation
does not show the configured avatar preview image and has no active mute or end
controls.

## Selected Approach

Render the existing `AvatarVideoStage` from `AvatarEmbedPage`.

The public configuration query will return the configured
`avatarPreviewUrl` alongside its existing public fields. The embed page will
pass the public key and preview URL into the shared stage.

This keeps one implementation for:

- the configured avatar preview image before a session starts;
- the neutral bottom-center `Start Chat` action;
- the live Avatar video after connection;
- mute and unmute controls during a session;
- the end-chat control;
- starting, stopping, speaking, listening, and error states.

The iframe page will provide only the responsive container around the shared
stage. It will not reproduce stage controls or session behavior.

## Public Data Boundary

`avatar.publicGetConfig` will continue returning data only for an enabled
configuration. Its public result will add the optional configured
`avatarPreviewUrl`.

No provider API key, session token, internal avatar identifier, voice
identifier, prompt, or workspace identity will be exposed.

## Layout

The embedded stage fills the iframe width and retains the shared 16:9 aspect
ratio. It must not add the existing black full-viewport shell, centered intro
card, or typed-message input.

The shared stage retains its rounded video surface and existing responsive
bottom spacing. The copied HTML and React iframe snippets remain unchanged.

## Feature Gating and Errors

The existing `enable_avatar_feature` public-route gate remains unchanged.
Missing, disabled, or invalid public configurations continue rendering
`AvatarUnavailableState`.

Session startup and runtime errors continue using the shared stage error
presentation. Microphone access remains initiated only by the visitor clicking
`Start Chat`.

## Testing

Add a regression contract proving that:

- `AvatarEmbedPage` renders `AvatarVideoStage`;
- it passes `publicKey` and `config.avatarPreviewUrl`;
- the duplicate `useAvatarSession`, `Start conversation`, intro card, video,
  and session controls are absent from `AvatarEmbedPage`;
- `publicGetConfig` returns the optional preview URL;
- the shared stage continues providing `Start Chat`, mute/unmute, and end-chat
  behavior.

Run the focused embed and stage tests, the Avatar regression suite, scoped
ESLint, and the production TypeScript/Vite build.

## Out of Scope

- Changing the generated iframe URL or snippet formats.
- Changing the configured avatar, voice, language, or LiveAvatar session mode.
- Adding typed chat, transcripts, diagnostics, or provider Embed V2.
- Deploying the application or changing production feature flags.
