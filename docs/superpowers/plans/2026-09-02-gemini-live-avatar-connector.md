# Gemini Live Avatar Connector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run Avatar conversations through LiveAvatar's Gemini Live connector while managers create and update the context used by every session.

**Architecture:** Persist context content and ID on the existing workspace Avatar configuration. A protected Convex action creates or patches the provider context; token issuance switches from FULL/KiloBot to the LITE Gemini connector. The browser retains the video lifecycle while removing KiloBot delivery and speech queuing.

**Tech Stack:** React, TypeScript, Convex, Vitest, `@heygen/liveavatar-web-sdk`, LiveAvatar REST API.

**Spec:** `docs/superpowers/specs/2026-09-02-gemini-live-avatar-connector-design.md`

## Global Constraints

- Use Node 22 for every script and test invocation.
- `LIVEAVATAR_API_KEY` and `HEYGEN_GEMINI_SECRET_ID` stay server-only and are never logged, persisted, or returned.
- Preserve sandbox duration, capacity checks, session registration, authorization, cleanup, and retryable UI errors.
- Use LITE mode, `Puck`, `gemini-3.1-flash-live-preview`, and `0.8` temperature.
- Refuse a session without a stored provider context.
- Keep production files under 300 lines and avoid comments.

## File Structure

- `convex/avatarProvider.ts` and its test define Gemini payloads.
- `convex/schema.ts`, `convex/avatar.ts`, and `convex/avatarCore.ts` persist and expose context data.
- `convex/avatarContext.ts` and its test own provider-context writes.
- `convex/avatarSession.ts` and its test issue LITE session tokens.
- `src/components/avatar/avatarSessionRuntime*` and `useAvatarSession.ts` provide the connector-only browser lifecycle.
- `src/components/avatar/AvatarContextEditor.tsx` and its test own the settings interaction.
- `src/pages/AvatarPage.tsx` renders the editor below the preview.

### Task 1: Add the Gemini token builder and context fields

**Files:** Modify `convex/avatarProvider.ts`, `convex/avatarProvider.test.ts`, `convex/schema.ts`, `convex/avatar.ts`, `convex/avatarCore.ts`.

**Produces:** `buildGeminiLiveTokenRequest({ sandbox, avatarId, contextId, secretId })` and dashboard fields `providerContextPrompt` / `providerContextOpeningText`.

- [ ] **Step 1: Write the failing provider test.**

```ts
expect(buildGeminiLiveTokenRequest({ sandbox: true, avatarId: 'avatar-id', contextId: 'context-id', secretId: 'secret-id' })).toEqual({
  mode: 'LITE', is_sandbox: true, avatar_id: 'dd73ea75-1218-4ef3-92ce-606d5f7fbc0a', max_session_duration: 60,
  gemini_realtime_config: { secret_id: 'secret-id', context_id: 'context-id', voice: 'Puck', model: 'gemini-3.1-flash-live-preview', temperature: 0.8 },
});
```

- [ ] **Step 2: Verify RED.** Run `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/avatarProvider.test.ts`; expect the missing export failure.

- [ ] **Step 3: Implement the minimal builder and schema fields.** Add optional `providerContextPrompt` and `providerContextOpeningText` validators. The builder accepts the opaque secret ID as an argument and returns no FULL-mode `avatar_persona` field.

- [ ] **Step 4: Verify GREEN.** Run `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/avatarProvider.test.ts && bunx convex codegen`; expect exit 0.

- [ ] **Step 5: Commit.** Run `git add convex/avatarProvider.ts convex/avatarProvider.test.ts convex/schema.ts convex/avatar.ts convex/avatarCore.ts convex/_generated && git commit -m "Add Gemini Live avatar configuration"`.

### Task 2: Add protected provider-context management

**Files:** Create `convex/avatarContext.ts`, `convex/avatarContext.test.ts`; modify `convex/avatar.ts` and `convex/avatarCore.ts`.

**Consumes:** `internal.avatar.internalGetSetupContext`.

**Produces:** `api.avatarContext.save({ agentId, prompt, openingText }): Promise<null>` and `internal.avatar.saveProviderContext`.

- [ ] **Step 1: Write failing action tests.** Mock `fetch` and assert first save sends `POST https://api.liveavatar.com/v1/contexts` with `{ name: 'Support Avatar', prompt: 'Help customers with billing.', opening_text: 'Hello, how can I help?' }`; assert an existing ID sends `PATCH /v1/contexts/context-id`. Cover unauthorized agents and no persistence after a failed provider request.

- [ ] **Step 2: Verify RED.** Run `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/avatarContext.test.ts`; expect module/action missing.

- [ ] **Step 3: Implement the action.** Validate trimmed non-empty inputs before fetch. Resolve the authorized setup; create when `contextId` is absent and otherwise PATCH. On a successful provider response, call `saveProviderContext` with the returned `id`, prompt, and opening text. The mutation updates only after provider success.

- [ ] **Step 4: Verify GREEN.** Run `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/avatarContext.test.ts`; expect create, update, authorization, and failed-write tests to pass.

- [ ] **Step 5: Commit.** Run `git add convex/avatar.ts convex/avatarCore.ts convex/avatarContext.ts convex/avatarContext.test.ts && git commit -m "Add Avatar provider context management"`.

### Task 3: Issue LITE Gemini session tokens

**Files:** Modify `convex/avatarSession.ts`, `convex/avatarProvider.ts`, `convex/avatarSession.test.ts`.

**Consumes:** Stored `providerContextId` plus server-only `HEYGEN_GEMINI_SECRET_ID`.

**Produces:** Existing safe browser result `{ sessionId, sessionToken }` with connector-configured provider request.

- [ ] **Step 1: Write failing token tests.** Assert the outgoing request contains `mode: 'LITE'` and `gemini_realtime_config.context_id`, contains no `avatar_persona`, rejects a missing context or secret ID, retains sandbox/capacity behavior, and never returns either server-side value.

- [ ] **Step 2: Verify RED.** Run `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/avatarSession.test.ts`; expect FULL token expectations to fail.

- [ ] **Step 3: Implement the minimal token switch.** Read and trim `configuration.providerContextId` and `process.env.HEYGEN_GEMINI_SECRET_ID`; fail clearly when either is absent; call `buildGeminiLiveTokenRequest` with them. Preserve response parsing and `registerSession`.

- [ ] **Step 4: Verify GREEN.** Run `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/avatarSession.test.ts convex/avatarProvider.test.ts`; expect exit 0.

- [ ] **Step 5: Commit.** Run `git add convex/avatarSession.ts convex/avatarSession.test.ts convex/avatarProvider.ts convex/avatarProvider.test.ts && git commit -m "Use Gemini Live for Avatar sessions"`.

### Task 4: Remove KiloBot from the browser voice turn

**Files:** Modify `src/components/avatar/avatarSessionRuntime.ts`, `src/components/avatar/avatarSessionRuntimeTypes.ts`, `src/components/avatar/useAvatarSession.ts`, `src/components/avatar/avatarSessionRuntime.test.ts`, `src/pages/AvatarEmbedPage.test.ts`.

**Produces:** A connector-only runtime whose services expose `begin`, `recordEvent`, `createClient`, and `now`.

- [ ] **Step 1: Write failing runtime assertions.** After stream readiness, assert active state and microphone start, then assert no `receiveTranscript`, `syncMessages`, `repeat`, or `interrupt` calls. Update the source-level page regression to reject `api.avatarConversation.receiveTranscript`, `api.avatarConversation.listMessages`, and `this.client.repeat(`.

- [ ] **Step 2: Verify RED.** Run `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/avatar/avatarSessionRuntime.test.ts src/pages/AvatarEmbedPage.test.ts`; expect the existing KiloBot behavior to violate the new tests.

- [ ] **Step 3: Remove transcript and speech queue code.** Delete source-event state, message subscriptions, user-transcript forwarding, reply queuing, `repeat`, and interruption. Keep provider stream attach, microphone start, mute/unmute, stopped-event recording, generation guards, and idempotent cleanup.

- [ ] **Step 4: Verify GREEN.** Run `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/avatar/avatarSessionRuntime.test.ts src/pages/AvatarEmbedPage.test.ts`; expect lifecycle regressions to pass without KiloBot delivery.

- [ ] **Step 5: Commit.** Run `git add src/components/avatar/avatarSessionRuntime.ts src/components/avatar/avatarSessionRuntimeTypes.ts src/components/avatar/useAvatarSession.ts src/components/avatar/avatarSessionRuntime.test.ts src/pages/AvatarEmbedPage.test.ts && git commit -m "Run Avatar conversations through Gemini connector"`.

### Task 5: Add the manager context editor

**Files:** Create `src/components/avatar/AvatarContextEditor.tsx`, `src/components/avatar/AvatarContextEditor.test.tsx`; modify `src/pages/AvatarPage.tsx`.

**Consumes:** `api.avatarContext.save`, `providerContextPrompt`, `providerContextOpeningText`, and `canManage`.

**Produces:** `AvatarContextEditor({ agentId, prompt, openingText, canManage })`.

- [ ] **Step 1: Write failing component tests.** Render the editor, change the label `System instructions`, assert the `Save context` button enables, save, and expect `{ agentId: 'agent-id', prompt: 'Help with billing.', openingText: 'Hello!' }`. Also cover blank fields, unchanged state, managers only, success feedback, and visible provider error.

- [ ] **Step 2: Verify RED.** Run `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/avatar/AvatarContextEditor.test.tsx`; expect missing component failure.

- [ ] **Step 3: Implement the editor and page composition.** Use a labelled `Textarea` for instructions and `Input` for opening text. Disable or hide Save unless trimmed values are non-empty and differ from saved props. Preserve drafts while saving, toast success, and render caught provider errors. Render beneath the dashboard preview only for managers.

- [ ] **Step 4: Verify GREEN.** Run `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/avatar/AvatarContextEditor.test.tsx src/pages/AvatarEmbedPage.test.ts`; expect exit 0.

- [ ] **Step 5: Commit.** Run `git add src/components/avatar/AvatarContextEditor.tsx src/components/avatar/AvatarContextEditor.test.tsx src/pages/AvatarPage.tsx src/pages/AvatarEmbedPage.test.ts && git commit -m "Add Avatar context settings"`.

### Task 6: Perform integrated local verification

**Files:** Modify `CONTINUITY.md`.

- [ ] **Step 1: Generate types and run focused tests.** Run `source ~/.nvm/nvm.sh && nvm use 22 && bunx convex codegen && bunx vitest run convex/avatarProvider.test.ts convex/avatarContext.test.ts convex/avatarSession.test.ts src/components/avatar/avatarSessionRuntime.test.ts src/components/avatar/AvatarContextEditor.test.tsx src/pages/AvatarEmbedPage.test.ts`; expect exit 0.

- [ ] **Step 2: Run quality checks.** Run `source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint convex/avatarProvider.ts convex/avatarContext.ts convex/avatarSession.ts convex/avatar.ts convex/avatarCore.ts src/components/avatar/AvatarContextEditor.tsx src/components/avatar/avatarSessionRuntime.ts src/components/avatar/avatarSessionRuntimeTypes.ts src/components/avatar/useAvatarSession.ts src/pages/AvatarPage.tsx && bun run build && git diff --check`; expect exit 0.

- [ ] **Step 3: Verify environment presence without exposing values.** Run `source ~/.nvm/nvm.sh && nvm use 22 && node -e "for (const key of ['LIVEAVATAR_API_KEY','HEYGEN_SANDBOX_MODE','HEYGEN_GEMINI_SECRET_ID']) if (!process.env[key]?.trim()) throw new Error(key + ' is required')"`; expect exit 0 and no values printed.

- [ ] **Step 4: Test sandbox manually.** Start `source ~/.nvm/nvm.sh && nvm use 22 && bun run dev --host 127.0.0.1 --port 5178`; save a context, start the Avatar sandbox, grant microphone access, verify Gemini speech, mute/unmute, End, retry, and no KiloBot Inbox reply.

- [ ] **Step 5: Record receipts and commit.** Run `git add CONTINUITY.md docs/superpowers/plans/2026-09-02-gemini-live-avatar-connector.md convex src && git commit -m "Complete Gemini Live Avatar connector"`.
