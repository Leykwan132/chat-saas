# Gemini Live Avatar Connector Design

## Status

Approved on 2026-09-02.

## Goal

Replace the Avatar feature's KiloBot-backed FULL-mode voice path with LiveAvatar's Gemini Live connector. Managers can author a reusable LiveAvatar context from the Avatar page and every session uses that context plus the externally managed Gemini secret for the lowest-latency conversational path.

## Constraints

- `LIVEAVATAR_API_KEY` and `HEYGEN_GEMINI_SECRET_ID` are server-only environment variables.
- `HEYGEN_GEMINI_SECRET_ID` is an opaque LiveAvatar secret reference, not a Gemini API key. It must never reach a browser, a Convex document, logs, or responses.
- The current workspace-scoped Avatar configuration owns one LiveAvatar context.
- The Gemini connector token must use `mode: "LITE"`, `gemini_realtime_config.secret_id`, `gemini_realtime_config.context_id`, voice `Puck`, model `gemini-3.1-flash-live-preview`, and temperature `0.8`.
- A session may not start until an Avatar, a LiveAvatar context, and the server-side Gemini secret reference are available.
- Sandbox behavior, session limits, session registration, authorization, and the Avatar video stage remain intact.
- No touched production code file may exceed 300 lines. Code uses no comments unless unavoidable.

## Design

### Provider context

`avatarConfigurations` stores the provider context ID plus the manager-authored prompt and opening text. The local values make the settings page immediately consistent and retain the last confirmed provider configuration.

An authorized `avatarContext.save` Convex action receives the prompt and opening text. It resolves the workspace configuration and agent name. If no context exists, it calls `POST /v1/contexts` with a stable name derived from the agent. Otherwise it calls `PATCH /v1/contexts/{context_id}`. After a successful provider response, an internal mutation atomically persists the returned ID and submitted context content. A failed provider request leaves local data unchanged.

The page does not expose raw provider IDs or secret IDs. Empty context state explains that a context must be saved before starting a session.

### Session token

`avatarSession.begin` continues to be the only public server boundary for browser session access. It validates the active configuration and capacity, reads both server environment values, and requests a session token from LiveAvatar with the Gemini realtime connector configuration. It registers the returned session exactly as today and returns only `sessionId` and `sessionToken`.

The FULL-mode persona payload and KiloBot-specific turn orchestration are removed from this session path. Gemini receives microphone audio and produces avatar-synchronized speech through LiveAvatar's managed connector, avoiding a KiloBot transcription, reply, and `repeat` round trip.

### Browser runtime

The Avatar video stage still owns explicit Start, mute/unmute, End, loading, error, and cleanup states. Its SDK adapter is reduced to the LITE connector lifecycle: start the tokenized session, attach the provider stream, enable microphone capture after the Start gesture, and stop the session cleanly. It does not send transcript events to KiloBot, observe KiloBot messages, or queue speech segments.

The public embed route and dashboard preview use that same connector-backed runtime. The browser sees only the short-lived session token and provider WebRTC credentials exposed through the SDK.

### Avatar settings

The configured Avatar page adds a Context section beneath the preview. It contains a required system-instructions textarea, an opening-text input, and a save action visible to managers. It loads the saved local content, disables saving until fields are valid and changed, reports provider failures visibly, and refreshes after a save. Existing avatar/voice editing remains unchanged.

### Error handling

Missing `LIVEAVATAR_API_KEY`, `HEYGEN_GEMINI_SECRET_ID`, avatar data, or context produces a clear, retryable server error and never falls back to FULL mode or KiloBot. Context saves do not overwrite local state on provider failure. Runtime start and microphone failures clean up the current SDK instance before returning to the existing retryable stage state.

## Testing

- Provider payload helpers have focused red-green tests for LITE mode and the exact Gemini connector configuration, including no credential leakage.
- Context-save tests cover create, update, authorization, provider failure, and persistence only after a successful provider response.
- Session tests verify context ID inclusion, required-secret/context failures, retained session capacity, sandbox duration, and opaque token responses.
- Runtime tests verify Gemini sessions do not deliver transcripts to KiloBot or call `repeat`, while start, stream attachment, mute, End, and cleanup remain covered.
- Page tests cover the context editor, unsaved changes, disabled save states, success, and provider-error feedback.
- Under Node 22, run focused Vitest suites, scoped lint, a production build, line-count validation, and `git diff --check`.

## Local verification

Set `LIVEAVATAR_API_KEY`, `HEYGEN_SANDBOX_MODE`, and `HEYGEN_GEMINI_SECRET_ID` in the local Convex environment. Configure an avatar and save a context on its Avatar page. Start a sandbox session, grant microphone access, verify Gemini responds through the avatar without an Inbox/KiloBot reply, then verify mute, End, retry, and context edits.
