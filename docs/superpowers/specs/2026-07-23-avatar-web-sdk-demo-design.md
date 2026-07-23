# Avatar Web SDK Demo Design

## Status

Approved on 2026-07-23. This design supersedes `2026-07-23-avatar-copy-handoff-design.md` for the configured Avatar overview.

## Goal

Replace the configured Avatar page's embed-code handoff with a voice-only LiveAvatar Web SDK experience that uses KiloBot's existing agent pipeline and a custom minimal video interface.

The browser must receive only a short-lived LiveAvatar session token. `LIVEAVATAR_API_KEY` remains backend-only.

## Approved Experience

The Avatar page retains its title, Beta badge, product description, permission-aware `Edit avatar` action, loading state, unauthorized state, and unconfigured empty state.

When an avatar is configured, the page renders one responsive 16:9 video stage instead of an embed snippet. The stage has these states:

- `idle`: Show the selected avatar preview and a neutral `Start Chat` button near the bottom center.
- `starting`: Keep the control position stable while showing a restrained spinner and `Starting…`.
- `active`: Render the attached LiveAvatar video with a small `Listening` or `KiloBot is speaking` status and two bottom controls.
- `stopping`: Disable controls while the session is being closed.
- `ended`: Restore the avatar preview and the neutral `Start Chat` button.
- `error`: Restore the avatar preview, show a concise failure message, and retain the neutral `Start Chat` retry button.

The active controls are:

- A neutral circular mute or unmute button with an accessible name and tooltip.
- A red circular End button with an accessible name and tooltip.

The configured experience does not show:

- Typed chat
- A transcript
- An embed snippet
- A provider iframe
- Microphone device selection
- Connection-quality diagnostics
- Session IDs or provider details
- Sandbox mode
- Avatar or voice IDs

## Layout

The page remains in its existing responsive `max-w-6xl` dashboard container. The header keeps its current responsive arrangement and `Edit avatar` action.

The video stage is centered below the header, fills the available content width up to a readable maximum, and retains a 16:9 aspect ratio. It uses a dark background, clipped rounded corners, and no surrounding Card. The video fills the stage using cover behavior.

The neutral `Start Chat` control is horizontally centered near the bottom of the stage with a deliberate inset from the bottom edge. It must not sit in the visual center or cover the avatar's face. Starting, ended, and error states preserve this bottom-center control position so the layout stays stable. Active controls use the same bottom-center zone with enough safe-area spacing for narrow mobile screens. Status and error text sit away from the controls and remain legible over light or dark video frames.

## Architecture

### Shared Session Engine

Extract the LiveAvatar lifecycle currently embedded in `AvatarEmbedPage` into a reusable session engine. The engine owns:

- Obtaining a backend-issued session token
- Constructing one `LiveAvatarSession`
- Registering and removing SDK event listeners
- Starting and stopping the provider session
- Attaching the stream to a supplied video element
- Starting, muting, and unmuting voice chat
- Receiving user transcription events
- Interrupting the avatar when the user starts a new turn
- Queueing KiloBot reply segments for `session.repeat`
- Waiting for `AVATAR_SPEAK_ENDED` before speaking the next segment
- Recording provider lifecycle events
- Cleaning up on End, disconnect, failed start, route change, and unmount

The engine exposes a small presentation contract:

- Session state
- Muted state
- User-speaking state
- Avatar-speaking state
- Current error
- Video attachment callback or ref
- `start`
- `stop`
- `mute`
- `unmute`

It does not render UI.

Only one start attempt or active SDK instance may exist at a time. Repeated clicks while starting or active are ignored.

### Consumers

`AvatarPage` uses the shared engine through a dashboard-specific video component. The page continues to own permission checks, configuration state selection, header actions, and the unconfigured empty state.

`AvatarEmbedPage` uses the same engine while retaining its public-route presentation. The public route is not embedded into the dashboard and is not used through an iframe.

The dashboard and public route may share small presentational primitives where their UX is identical, but they do not share a full-page component.

### Module Boundaries

Keep the feature modular:

- One SDK adapter or engine module for provider operations and event normalization
- One React hook for session state and application callbacks
- One focused dashboard video-stage component
- One focused public-runtime component
- Small pure state or queue helpers where they improve deterministic testing

No touched code file may exceed 300 lines.

## Backend and Configuration

### Configuration Boundary

An avatar is configured when it has a valid selected avatar, voice, and language. `embedUrl` is no longer the configured-state signal.

Creating or editing an avatar must validate the provider catalog and persist the selected avatar, voice, language, preview metadata, channel configuration, public key, and enabled state without requiring a LiveAvatar Embed V2 result.

The setup flow must stop creating a provider embedding solely to configure the Avatar page. It also must not create a LiveAvatar context solely for the removed Embed V2 path because KiloBot remains the response engine.

Existing embed-related fields may remain in the schema and existing documents during this slice. Removing persisted fields requires a separate widen-migrate-narrow cleanup.

### Session Token

The existing Convex action remains the backend boundary for LiveAvatar session creation:

1. Resolve the stored Avatar configuration.
2. Enforce explicit sandbox configuration and concurrent-session limits.
3. Read `LIVEAVATAR_API_KEY` only on the backend.
4. Request a FULL-mode LiveAvatar session token using the selected avatar, voice, language, and environment-specific duration.
5. Register the session.
6. Return only the session ID and short-lived session token.

Sandbox mode stays backend-only. Sandbox sessions remain limited to 60 seconds and production sessions to 600 seconds.

## Conversation Data Flow

Dashboard demo sessions use the real Avatar channel pipeline and appear in Inbox.

The end-to-end flow is:

1. The user clicks Start.
2. Convex obtains and returns a short-lived session token.
3. The Web SDK starts the LiveAvatar session.
4. On `SESSION_STREAM_READY`, the engine attaches the video and starts voice chat.
5. LiveAvatar emits a final user transcription.
6. Convex ingests the transcription into the Avatar channel conversation and enqueues the assigned KiloBot agent.
7. KiloBot output persists through the existing Avatar delivery path.
8. The client observes matching outgoing messages, splits them into bounded speech segments, and calls `session.repeat` sequentially.

The client must speak only outgoing messages tied to the active user source event. Older, unrelated, or previously spoken messages are ignored.

When `USER_SPEAK_STARTED` fires:

- Increment the active turn.
- Clear queued speech.
- Clear the active response source until the final transcription arrives.
- Interrupt current avatar speech.

This prevents stale KiloBot output from talking over a newer user turn.

## Session State and Cleanup

The session state model must distinguish `idle`, `starting`, `active`, `stopping`, `ended`, and `error`.

Cleanup is idempotent. It must:

- Stop voice chat when active.
- Stop the LiveAvatar session.
- Remove SDK and voice-chat listeners.
- Clear the SDK reference.
- Clear pending speech and speaking locks.
- Prevent late async work from mutating a newer session.

If the provider emits `SESSION_STOPPED`, record the lifecycle event and move to `ended`. If start fails after the backend registered a session, record `session.start_failed` before returning to a retryable error state.

Manual End must produce a terminal UI state even if the provider event is delayed. A later provider event may update backend lifecycle data but cannot revive the closed client session.

## Error Handling

Failures are visible and retryable. Do not silently fall back to another avatar, voice, language, mode, or embed path.

Handle these failure classes:

- Missing or invalid Avatar configuration
- Concurrent-session capacity rejection
- Backend token request failure
- LiveAvatar start or stream failure
- Microphone permission or voice-chat start failure
- Mutation failure while delivering a transcription
- Provider disconnect

Token, start, microphone, and provider failures end and clean up the local SDK instance before exposing retry.

A transcription-delivery failure must not invent a reply or switch to LiveAvatar's built-in response generation. Surface the failure for the active session and keep provider cleanup available.

## Accessibility

- Start, mute, unmute, and End are native buttons.
- Icon-only controls have explicit accessible names and tooltips.
- Status changes use an appropriate polite live region without repeatedly announcing streaming transcription.
- Focus remains visible against the video surface.
- Controls meet touch-target sizing and remain reachable on narrow screens.
- Video uses `autoPlay` and `playsInline`; microphone capture starts only after an explicit user gesture.

## Testing

Implementation follows red-green-refactor.

### Pure Session Behavior

Use a fake SDK adapter to verify:

- A second Start cannot create another session while starting or active.
- Stream readiness attaches the video and starts voice chat.
- Mute and unmute call the correct provider methods and update state.
- New user speech interrupts current speech and clears queued segments.
- Reply segments are spoken sequentially.
- Messages from stale source events are ignored.
- Stop and unmount cleanup are idempotent.
- Late events from an old session cannot change the new session.
- Start and microphone failures clean up and enter a retryable error state.

### Backend

Verify:

- The API key never appears in returned session data.
- Sandbox and production token requests retain their explicit durations.
- Token requests use the stored avatar, voice, and language.
- Configured-state persistence no longer requires an Embed V2 URL.
- Existing authorization and concurrent-session checks remain enforced.

### UI

Verify:

- The configured Avatar page renders the custom video stage.
- The embed-code handoff and provider iframe are absent.
- Idle, starting, active, ended, and error presentations are reachable from engine state.
- Idle, ended, and retry states use the exact `Start Chat` label with a neutral bottom-center control and deliberate bottom spacing.
- The start control does not appear in the visual center of the stage.
- Active UI contains only mute or unmute and End controls.
- No typed chat, transcript, diagnostics, IDs, or sandbox labels appear.
- `Edit avatar` remains permission-gated in the page header.
- The unconfigured empty state remains available.

### Verification

Under Node 22, run:

- Focused new session-engine, backend, and Avatar-page tests
- Existing Avatar test suites
- Scoped ESLint for touched files
- The production TypeScript and Vite build because this changes shared frontend and Convex boundaries
- Touched-code line-count checks
- `git diff --check`

Live provider behavior remains credential-dependent. If credentials are available, manually verify Start, microphone permission, KiloBot response speech, mute, interruption, End, retry, and Inbox appearance in sandbox mode.

## Migration and Compatibility

No destructive data migration is part of this slice.

Existing configurations with avatar, voice, and language values become configured even if their legacy `embedUrl` is absent. Existing provider embed fields remain readable but are ignored by the new dashboard configured state.

The public Avatar runtime keeps its route and behavior while moving onto the shared engine. Any later removal of legacy Embed V2 fields, actions, or stored contexts requires its own migration plan after confirming no external consumer still depends on them.

## Out of Scope

- Typed chat or visible transcripts
- Microphone device selection
- Connection diagnostics
- Avatar-specific billing or minute ledgers
- Automatic fallback behavior
- Replacing the KiloBot agent with LiveAvatar's built-in LLM
- Removing legacy embed fields from the schema
- Deploying the implementation
