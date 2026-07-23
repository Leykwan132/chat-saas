# Avatar Web SDK Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the configured Avatar embed-code handoff with a voice-only custom LiveAvatar Web SDK demo backed by KiloBot's real conversation pipeline.

**Architecture:** Persist validated avatar, voice, and language metadata without creating Embed V2. Move provider lifecycle and speech sequencing into one provider-independent runtime, adapt the HeyGen SDK behind a narrow interface, connect it to Convex through one React hook, and render separate public and dashboard presentations.

**Tech Stack:** React 19, TypeScript 6, Convex, `@heygen/liveavatar-web-sdk` 0.0.18, React Router, shadcn Button/Tooltip, Tailwind CSS 4, Vitest 1.6

## Global Constraints

- Run every script and test under Node v22 in the same shell execution sequence.
- Read `convex/_generated/ai/guidelines.md` before modifying Convex code.
- Keep every code file below 300 lines.
- Add no code comments.
- Preserve unrelated and pre-existing uncommitted workspace changes.
- Keep `LIVEAVATAR_API_KEY` backend-only.
- Keep sandbox mode backend-only: 60-second sandbox sessions and 600-second production sessions.
- Use FULL mode for LiveAvatar transport, ASR, voice, and video; KiloBot remains the response engine.
- Do not add typed chat, visible transcripts, device selection, connection diagnostics, provider IDs, sandbox labels, or automatic fallbacks.
- Use the exact `Start Chat` label in a neutral bottom-center button with deliberate bottom spacing.
- Dashboard demo conversations must use the real Avatar channel and appear in Inbox.
- Do not remove legacy provider-embed schema fields in this slice.
- Do not deploy.
- After implementation and verification, invoke the `liveavatar-feedback` skill before the final handoff.

---

### Task 1: Persist Avatar Configuration Without Embed V2

**Files:**
- Modify: `convex/avatarCore.ts`
- Modify: `convex/avatar.ts`
- Modify: `convex/avatarEmbed.ts`
- Modify: `convex/avatar.test.ts`
- Modify: `convex/avatarProvider.test.ts`
- Modify: `src/components/avatar/avatarTypes.ts`
- Modify: `src/pages/AvatarCreatePage.tsx`
- Modify: `src/pages/AvatarEmbedPage.test.ts`

**Interfaces:**
- Consumes: `validateLanguageVoiceSelection(catalog, selection)`, the protected public avatar/voice/language catalog, and `internal.avatar.internalGetSetupContext`.
- Produces: `configuration.configured: boolean`, `internal.avatar.saveConfiguration`, and `api.avatarEmbed.configure({ agentId, avatarId, voiceId, language }): Promise<null>`.

- [ ] **Step 1: Add failing backend and setup-flow contracts**

Add this test to `convex/avatar.test.ts`:

```ts
test('validated Avatar metadata configures the Web SDK runtime without an embed', async () => {
  const t = convexTest(schema, modules);
  const agentId = await createAgent(t, 'configured_owner');
  const authed = t.withIdentity({ subject: 'configured_owner' });
  const initial = await authed.mutation(api.avatar.ensureForAgent, { agentId });
  const configurationId = await t.run(async (ctx) => {
    const configuration = await ctx.db
      .query('avatarConfigurations')
      .withIndex('by_publicKey', (q) => q.eq('publicKey', initial.publicKey))
      .unique();
    if (!configuration) throw new Error('Avatar configuration not found');
    return configuration._id;
  });

  await t.mutation(internal.avatar.saveConfiguration, {
    configurationId,
    avatarId: 'avatar-id',
    avatarName: 'Wayne',
    avatarPreviewUrl: 'https://example.com/avatar.png',
    voiceId: 'voice-id',
    voiceName: 'Calm English',
    voiceLanguage: 'en',
    voiceGender: 'male',
    language: 'en',
  });

  const configured = await authed.query(api.avatar.getForAgent, { agentId });
  expect(configured).toMatchObject({
    configured: true,
    enabled: true,
    avatarName: 'Wayne',
    avatarPreviewUrl: 'https://example.com/avatar.png',
  });
  expect(configured?.embedUrl).toBeUndefined();
  expect(await t.query(api.avatar.publicGetConfig, {
    publicKey: initial.publicKey,
  })).toEqual({ publicKey: initial.publicKey, language: 'en' });
});
```

Replace the Embed V2 setup assertions in `convex/avatarProvider.test.ts` with:

```ts
it('configures validated metadata without creating a provider context or embedding', () => {
  const source = readFileSync(new URL('./avatarEmbed.ts', import.meta.url), 'utf8');
  const configureSource = source.slice(
    source.indexOf('export const configure = action'),
    source.indexOf('export const create = action'),
  );
  expect(configureSource).toContain('internal.avatar.saveConfiguration');
  expect(configureSource).not.toContain("'/v1/contexts'");
  expect(configureSource).not.toContain("'/v2/embeddings'");
  expect(configureSource).not.toContain('buildLiveAvatarEmbedRequest({');
});
```

Update the setup source contract in `src/pages/AvatarEmbedPage.test.ts`:

```ts
expect(createSource).toContain('api.avatarEmbed.configure');
expect(createSource).toContain("configuration?.configured ? 'Save changes' : 'Create avatar'");
expect(createSource).not.toContain('api.avatarEmbed.create');
expect(createSource).not.toContain('configuration?.embedUrl');
expect(avatarSessionSource).toContain('return { sessionId, sessionToken };');
expect(avatarSessionSource).not.toContain('return { sessionId, sessionToken, apiKey');
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/avatar.test.ts convex/avatarProvider.test.ts src/pages/AvatarEmbedPage.test.ts
```

Expected: FAIL because `configured`, `saveConfiguration`, and `api.avatarEmbed.configure` do not exist and the setup action still creates a context and Embed V2.

- [ ] **Step 3: Expose a provider-ID-free configured flag**

Update `dashboardAvatarConfiguration` in `convex/avatarCore.ts`:

```ts
export function dashboardAvatarConfiguration(configuration: Doc<'avatarConfigurations'>) {
  return {
    publicKey: configuration.publicKey,
    configured: Boolean(
      configuration.avatarId
      && configuration.voiceId
      && configuration.language,
    ),
    enabled: configuration.enabled,
    avatarName: configuration.avatarName,
    avatarPreviewUrl: configuration.avatarPreviewUrl,
    voiceName: configuration.voiceName,
    voiceLanguage: configuration.voiceLanguage,
    voiceGender: configuration.voiceGender,
    language: configuration.language,
    embedUrl: configuration.providerEmbedUrl,
    embedScript: configuration.providerEmbedScript,
    updatedAt: configuration.updatedAt,
  };
}
```

Add `configured: boolean` to `AvatarConfiguration` in `src/components/avatar/avatarTypes.ts`.

- [ ] **Step 4: Add the focused configuration mutation without removing the legacy mutation**

Add this before `saveProviderEmbed` in `convex/avatar.ts`. Keep `saveProviderEmbed` unchanged for the deferred legacy migration:

```ts
export const saveConfiguration = internalMutation({
  args: {
    configurationId: v.id('avatarConfigurations'),
    avatarId: v.string(),
    avatarName: v.string(),
    avatarPreviewUrl: v.optional(v.string()),
    voiceId: v.string(),
    voiceName: v.string(),
    voiceLanguage: v.string(),
    voiceGender: v.string(),
    language: v.string(),
  },
  handler: async (ctx, args) => {
    const configuration = await ctx.db.get(args.configurationId);
    if (!configuration) throw new Error('Avatar configuration not found');
    await ctx.db.patch(configuration._id, {
      enabled: true,
      avatarId: args.avatarId,
      avatarName: args.avatarName,
      avatarPreviewUrl: args.avatarPreviewUrl,
      voiceId: args.voiceId,
      voiceName: args.voiceName,
      voiceLanguage: args.voiceLanguage,
      voiceGender: args.voiceGender,
      language: args.language,
      updatedAt: Date.now(),
    });
  },
});
```

Change the `updateSettings` enablement guard to:

```ts
if (args.enabled && (!configuration.avatarId || !configuration.voiceId)) {
  throw new Error('Configure an avatar and voice first');
}
```

- [ ] **Step 5: Add validated persistence beside the unused legacy embed action**

In `convex/avatarEmbed.ts`, add `configure` immediately before the existing `create` action. Keep the existing imports and `create` action unchanged so legacy removal stays out of this slice:

```ts
export const configure = action({
  args: {
    agentId: v.id('agents'),
    avatarId: v.string(),
    voiceId: v.string(),
    language: v.string(),
  },
  handler: async (ctx, args): Promise<null> => {
    const setup = await ctx.runQuery(internal.avatar.internalGetSetupContext, {
      agentId: args.agentId,
    });
    const language = args.language.trim();
    if (!language || language.length > 5) {
      throw new Error('Choose a valid language');
    }
    const catalog = await loadCatalog(requireApiKey());
    const avatar = catalog.avatars.find((item) => item.id === args.avatarId);
    if (!avatar) throw new Error('Choose an available avatar');
    const voice = validateLanguageVoiceSelection(catalog, {
      language,
      voiceId: args.voiceId,
    });
    await ctx.runMutation(internal.avatar.saveConfiguration, {
      configurationId: setup.configurationId,
      avatarId: avatar.id,
      avatarName: avatar.name,
      ...(avatar.previewUrl ? { avatarPreviewUrl: avatar.previewUrl } : {}),
      voiceId: voice.id,
      voiceName: voice.name,
      voiceLanguage: voice.language,
      voiceGender: voice.gender,
      language,
    });
    return null;
  },
});
```

- [ ] **Step 6: Move the setup page to the configuration action**

In `src/pages/AvatarCreatePage.tsx`:

```ts
const configureAvatar = useAction(api.avatarEmbed.configure);
```

Replace the save call and copy:

```ts
await configureAvatar({
  agentId: typedAgentId,
  avatarId: selectedAvatarId,
  voiceId: selectedVoiceId,
  language,
});
toast.success(configuration?.configured ? 'Avatar updated' : 'Avatar created');
```

Use the configured flag for the submit label:

```tsx
{creating ? 'Saving…' : configuration?.configured ? 'Save changes' : 'Create avatar'}
```

- [ ] **Step 7: Run focused tests and verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/avatar.test.ts convex/avatarProvider.test.ts src/pages/AvatarEmbedPage.test.ts
```

Expected: All focused tests pass.

- [ ] **Step 8: Run scoped lint, typecheck, and commit**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint convex/avatar.ts convex/avatarCore.ts convex/avatarEmbed.ts convex/avatar.test.ts convex/avatarProvider.test.ts src/components/avatar/avatarTypes.ts src/pages/AvatarCreatePage.tsx src/pages/AvatarEmbedPage.test.ts
source ~/.nvm/nvm.sh && nvm use 22 && bunx tsc -p convex/tsconfig.json --noEmit
git diff --check
wc -l convex/avatar.ts convex/avatarCore.ts convex/avatarEmbed.ts src/pages/AvatarCreatePage.tsx
```

Expected: Exit 0 and every code file is below 300 lines.

Commit:

```bash
git add convex/avatar.ts convex/avatarCore.ts convex/avatarEmbed.ts convex/avatar.test.ts convex/avatarProvider.test.ts src/components/avatar/avatarTypes.ts src/pages/AvatarCreatePage.tsx src/pages/AvatarEmbedPage.test.ts
git commit -m "Configure Avatar without provider embed"
```

---

### Task 2: Build the Provider-Independent Session Runtime

**Files:**
- Create: `src/components/avatar/avatarSessionRuntime.ts`
- Create: `src/components/avatar/avatarSessionRuntime.test.ts`
- Create: `src/components/avatar/liveAvatarSessionClient.ts`

**Interfaces:**
- Produces: `AvatarSessionRuntime`, `AvatarSessionSnapshot`, `AvatarSessionIdentity`, `AvatarSessionMessage`, `AvatarSessionClient`, `AvatarSessionServices`, and `createLiveAvatarSessionClient(token)`.
- Consumes later: `runtime.start()`, `runtime.stop()`, `runtime.mute()`, `runtime.unmute()`, `runtime.attachVideo(element)`, `runtime.syncMessages(messages)`, `runtime.subscribe(listener)`, and `runtime.getSnapshot()`.

- [ ] **Step 1: Write a real fake-client runtime contract**

Create `src/components/avatar/avatarSessionRuntime.test.ts` with a `FakeAvatarSessionClient` implementing the interface below and tests that prove:

```ts
it('allows only one start and activates after stream readiness', async () => {
  const harness = createRuntimeHarness();
  const first = harness.runtime.start();
  const second = harness.runtime.start();
  expect(harness.beginCalls).toBe(1);
  await Promise.resolve();
  await harness.client.emitStreamReady();
  await first;
  await second;
  expect(harness.client.startCalls).toBe(1);
  expect(harness.client.voiceStartCalls).toBe(1);
  expect(harness.runtime.getSnapshot().phase).toBe('active');
});

it('mutes, unmutes, and tears down idempotently', async () => {
  const harness = await createActiveRuntimeHarness();
  await harness.runtime.mute();
  await harness.runtime.unmute();
  await harness.runtime.stop();
  await harness.runtime.stop();
  expect(harness.client.muteCalls).toBe(1);
  expect(harness.client.unmuteCalls).toBe(1);
  expect(harness.client.stopCalls).toBe(1);
  expect(harness.runtime.getSnapshot().phase).toBe('ended');
});

it('interrupts stale speech when the user starts another turn', async () => {
  const harness = await createActiveRuntimeHarness();
  harness.client.emitUserTranscription({
    eventId: 'turn-1',
    sourceEventId: null,
    text: 'Hello',
  });
  harness.runtime.syncMessages([outgoingMessage('reply-1', 'turn-1', 'First. Second.')]);
  expect(harness.client.repeated).toEqual(['First.']);
  harness.client.emitUserSpeechStarted();
  expect(harness.client.interruptCalls).toBe(1);
  harness.client.emitAvatarSpeechEnded();
  expect(harness.client.repeated).toEqual(['First.']);
});

it('speaks only messages for the active source event in order', async () => {
  const harness = await createActiveRuntimeHarness();
  harness.client.emitUserTranscription({
    eventId: 'turn-2',
    sourceEventId: null,
    text: 'Continue',
  });
  harness.runtime.syncMessages([
    outgoingMessage('stale', 'turn-1', 'Ignore me.'),
    outgoingMessage('current', 'turn-2', 'One. Two.'),
  ]);
  expect(harness.client.repeated).toEqual(['One.']);
  await harness.client.emitAvatarSpeechEnded();
  await Promise.resolve();
  expect(harness.client.repeated).toEqual(['One.', 'Two.']);
});

it('cleans up and exposes a retryable error when voice start fails', async () => {
  const harness = createRuntimeHarness({ voiceStartError: new Error('Microphone denied') });
  const started = harness.runtime.start();
  await Promise.resolve();
  await harness.client.emitStreamReady();
  await started;
  expect(harness.client.stopCalls).toBe(1);
  expect(harness.runtime.getSnapshot()).toMatchObject({
    phase: 'error',
    error: 'Microphone denied',
  });
});

it('cleans up and exposes a retryable error when SDK start fails', async () => {
  const harness = createRuntimeHarness({ startError: new Error('Provider unavailable') });
  await harness.runtime.start();
  expect(harness.client.stopCalls).toBe(1);
  expect(harness.runtime.getSnapshot()).toMatchObject({
    phase: 'error',
    error: 'Provider unavailable',
  });
});

it('turns a provider disconnect into a cleaned retryable error', async () => {
  const harness = await createActiveRuntimeHarness();
  await harness.client.emitDisconnected('Server initiated disconnect');
  expect(harness.client.stopCalls).toBe(1);
  expect(harness.runtime.getSnapshot()).toMatchObject({
    phase: 'error',
    error: 'Server initiated disconnect',
  });
});

it('ignores handlers retained from an older generation', async () => {
  const harness = await createActiveRuntimeHarness();
  const staleHandlers = harness.client.boundHandlers;
  await harness.runtime.stop();
  await harness.runtime.start();
  staleHandlers.userSpeechStarted();
  expect(harness.client.interruptCalls).toBe(0);
});
```

Keep the complete test file below 300 lines by sharing `createRuntimeHarness`, `createActiveRuntimeHarness`, and `outgoingMessage`.

- [ ] **Step 2: Run the runtime contract and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/avatar/avatarSessionRuntime.test.ts
```

Expected: FAIL because the runtime module does not exist.

- [ ] **Step 3: Define the exact runtime interfaces**

Create `src/components/avatar/avatarSessionRuntime.ts` with these exported types:

```ts
export type AvatarSessionPhase =
  | 'idle'
  | 'starting'
  | 'active'
  | 'stopping'
  | 'ended'
  | 'error';

export type AvatarSessionIdentity = {
  publicKey: string;
  visitorId: string;
  sessionId: string;
};

export type AvatarSessionEvent = {
  eventId: string;
  sourceEventId: string | null;
};

export type AvatarTranscriptionEvent = AvatarSessionEvent & { text: string };
export type AvatarStoppedEvent = AvatarSessionEvent & { stopReason: string };

export type AvatarSessionMessage = {
  id: string;
  direction: 'incoming' | 'outgoing';
  content: string;
  contentType: string;
  sourceEventId?: string;
  createdAt: number;
};

export type AvatarSessionSnapshot = {
  phase: AvatarSessionPhase;
  muted: boolean;
  userSpeaking: boolean;
  avatarSpeaking: boolean;
  error: string | null;
  identity: AvatarSessionIdentity | null;
};

export type AvatarSessionHandlers = {
  streamReady: () => void;
  disconnected: (reason: string) => void;
  userSpeechStarted: () => void;
  userSpeechEnded: () => void;
  userTranscription: (event: AvatarTranscriptionEvent) => void;
  avatarSpeechStarted: () => void;
  avatarSpeechEnded: () => void;
  stopped: (event: AvatarStoppedEvent) => void;
};

export type AvatarSessionClient = {
  bind(handlers: AvatarSessionHandlers): () => void;
  start(): Promise<void>;
  stop(): Promise<void>;
  attach(element: HTMLMediaElement): void;
  startVoiceChat(): Promise<void>;
  stopVoiceChat(): void;
  mute(): Promise<void>;
  unmute(): Promise<void>;
  interrupt(): void;
  repeat(text: string): string;
};

export type AvatarSessionServices = {
  begin(): Promise<AvatarSessionIdentity & { sessionToken: string }>;
  receiveTranscript(
    identity: AvatarSessionIdentity,
    event: AvatarTranscriptionEvent,
  ): Promise<void>;
  recordEvent(
    identity: AvatarSessionIdentity,
    event: AvatarSessionEvent & {
      eventType: string;
      endReason?: string;
    },
  ): Promise<void>;
  createClient(sessionToken: string): AvatarSessionClient;
  splitSpeech(text: string): string[];
  now(): number;
};
```

- [ ] **Step 4: Implement the runtime state machine**

Implement `AvatarSessionRuntime` in the same file with:

```ts
export class AvatarSessionRuntime {
  private snapshot: AvatarSessionSnapshot = {
    phase: 'idle',
    muted: false,
    userSpeaking: false,
    avatarSpeaking: false,
    error: null,
    identity: null,
  };
  private readonly listeners = new Set<() => void>();
  private client: AvatarSessionClient | null = null;
  private unbind: (() => void) | null = null;
  private video: HTMLMediaElement | null = null;
  private generation = 0;
  private startedAt = 0;
  private activeSourceEventId: string | null = null;
  private turn = 0;
  private pendingSpeech: string[] = [];
  private spokenIds = new Set<string>();
  private speechResolver: (() => void) | null = null;
  private draining = false;
  private cleanupPromise: Promise<void> | null = null;

  constructor(private readonly services: AvatarSessionServices) {}

  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  attachVideo = (element: HTMLMediaElement | null) => {
    this.video = element;
    if (element && this.snapshot.phase === 'active') this.client?.attach(element);
  };

  start = async () => {
    if (['starting', 'active', 'stopping'].includes(this.snapshot.phase)) return;
    const generation = ++this.generation;
    this.startedAt = this.services.now();
    this.activeSourceEventId = null;
    this.turn = 0;
    this.pendingSpeech = [];
    this.spokenIds = new Set();
    this.publish({
      phase: 'starting',
      muted: false,
      userSpeaking: false,
      avatarSpeaking: false,
      error: null,
      identity: null,
    });
    try {
      const access = await this.services.begin();
      if (generation !== this.generation) return;
      const { sessionToken, ...identity } = access;
      const client = this.services.createClient(sessionToken);
      this.client = client;
      this.publish({ ...this.snapshot, identity });
      this.unbind = client.bind(this.handlers(generation));
      await client.start();
    } catch (error) {
      await this.fail(generation, error);
    }
  };

  stop = async () => {
    if (this.snapshot.phase === 'idle' || this.snapshot.phase === 'ended') return;
    if (this.snapshot.phase !== 'error') {
      this.publish({ ...this.snapshot, phase: 'stopping' });
    }
    ++this.generation;
    await this.cleanup();
    this.publish({
      ...this.snapshot,
      phase: 'ended',
      muted: false,
      userSpeaking: false,
      avatarSpeaking: false,
      error: null,
    });
  };

  mute = async () => {
    if (this.snapshot.phase !== 'active' || !this.client) return;
    await this.client.mute();
    this.publish({ ...this.snapshot, muted: true });
  };

  unmute = async () => {
    if (this.snapshot.phase !== 'active' || !this.client) return;
    await this.client.unmute();
    this.publish({ ...this.snapshot, muted: false });
  };

  syncMessages = (messages: AvatarSessionMessage[]) => {
    if (!this.activeSourceEventId || !this.snapshot.identity) return;
    for (const message of messages) {
      if (
        message.direction !== 'outgoing'
        || message.contentType !== 'text'
        || message.createdAt < this.startedAt
        || message.sourceEventId !== this.activeSourceEventId
        || this.spokenIds.has(message.id)
      ) continue;
      this.spokenIds.add(message.id);
      this.pendingSpeech.push(...this.services.splitSpeech(message.content));
    }
    void this.drainSpeech(this.generation, this.turn);
  };

  destroy = async () => { await this.stop(); };
}
```

Add private `publish`, `handlers`, `drainSpeech`, `fail`, `releaseSpeechWait`, and `cleanup` methods. Use these concrete event transitions:

```ts
private handlers(generation: number): AvatarSessionHandlers {
  const current = () => generation === this.generation;
  return {
    streamReady: () => {
      void (async () => {
        if (!current() || !this.client) return;
        if (this.video) this.client.attach(this.video);
        try {
          await this.client.startVoiceChat();
          if (current()) this.publish({ ...this.snapshot, phase: 'active' });
        } catch (error) {
          await this.fail(generation, error);
        }
      })();
    },
    disconnected: (reason) => {
      if (current()) void this.fail(generation, new Error(reason));
    },
    userSpeechStarted: () => {
      if (!current() || !this.client) return;
      this.turn += 1;
      this.activeSourceEventId = null;
      this.pendingSpeech = [];
      this.releaseSpeechWait();
      this.client.interrupt();
      this.publish({ ...this.snapshot, userSpeaking: true });
    },
    userSpeechEnded: () => {
      if (current()) this.publish({ ...this.snapshot, userSpeaking: false });
    },
    userTranscription: (event) => {
      if (!current() || !this.snapshot.identity) return;
      this.activeSourceEventId = event.eventId;
      void this.services
        .receiveTranscript(this.snapshot.identity, event)
        .catch((error) => this.fail(generation, error));
    },
    avatarSpeechStarted: () => {
      if (current()) this.publish({ ...this.snapshot, avatarSpeaking: true });
    },
    avatarSpeechEnded: () => {
      if (!current()) return;
      this.publish({ ...this.snapshot, avatarSpeaking: false });
      this.releaseSpeechWait();
    },
    stopped: (event) => {
      if (!current() || !this.snapshot.identity) return;
      const identity = this.snapshot.identity;
      void this.services.recordEvent(identity, {
        eventId: event.eventId,
        sourceEventId: event.sourceEventId,
        eventType: 'session.stopped',
        endReason: event.stopReason,
      });
      ++this.generation;
      void this.cleanup().then(() => {
        this.publish({ ...this.snapshot, phase: 'ended' });
      });
    },
  };
}

private async drainSpeech(generation: number, turn: number) {
  if (this.draining) return;
  this.draining = true;
  try {
    while (
      generation === this.generation
      && turn === this.turn
      && this.pendingSpeech.length > 0
      && this.client
    ) {
      const text = this.pendingSpeech.shift();
      if (!text) continue;
      this.client.repeat(text);
      await new Promise<void>((resolve) => {
        this.speechResolver = resolve;
      });
    }
  } finally {
    this.draining = false;
    if (
      generation === this.generation
      && turn === this.turn
      && this.pendingSpeech.length > 0
    ) {
      void this.drainSpeech(generation, turn);
    }
  }
}

private async fail(generation: number, error: unknown) {
  if (generation !== this.generation) return;
  const identity = this.snapshot.identity;
  const message = error instanceof Error ? error.message : 'Avatar session failed';
  ++this.generation;
  await this.cleanup();
  if (identity) {
    await this.services.recordEvent(identity, {
      eventId: crypto.randomUUID(),
      sourceEventId: null,
      eventType: 'session.start_failed',
      endReason: message,
    });
  }
  this.publish({ ...this.snapshot, phase: 'error', error: message });
}
```

`publish` replaces `snapshot` and notifies every listener. `releaseSpeechWait` takes the current resolver, clears the field, and invokes it once. `cleanup` memoizes one in-flight promise, calls `stopVoiceChat`, awaits `client.stop`, invokes `unbind`, clears client/unbind/queue/drain fields, then clears the memoized promise. If stop fails, propagate that error to `fail` when there is no earlier operational error; do not use an empty catch.

Do not add empty catches. When provider stop fails during cleanup, retain the first operational error and surface the stop failure only when no earlier error exists.

- [ ] **Step 5: Adapt the HeyGen SDK behind the runtime interface**

Create `src/components/avatar/liveAvatarSessionClient.ts`:

```ts
import {
  AgentEventsEnum,
  LiveAvatarSession,
  SessionEvent,
} from '@heygen/liveavatar-web-sdk';
import type {
  AvatarSessionClient,
  AvatarSessionHandlers,
} from './avatarSessionRuntime';

export function createLiveAvatarSessionClient(token: string): AvatarSessionClient {
  const session = new LiveAvatarSession(token);
  return {
    bind(handlers: AvatarSessionHandlers) {
      const streamReady = () => handlers.streamReady();
      const disconnected = (reason: string) => handlers.disconnected(reason);
      const userSpeechStarted = () => handlers.userSpeechStarted();
      const userSpeechEnded = () => handlers.userSpeechEnded();
      const userTranscription = (event: {
        event_id: string;
        source_event_id?: string;
        text: string;
      }) => handlers.userTranscription({
        eventId: event.event_id,
        sourceEventId: event.source_event_id ?? null,
        text: event.text,
      });
      const avatarSpeechStarted = () => handlers.avatarSpeechStarted();
      const avatarSpeechEnded = () => handlers.avatarSpeechEnded();
      const stopped = (event: {
        event_id: string;
        source_event_id?: string;
        stop_reason: string;
      }) => handlers.stopped({
        eventId: event.event_id,
        sourceEventId: event.source_event_id ?? null,
        stopReason: event.stop_reason,
      });
      session.on(SessionEvent.SESSION_STREAM_READY, streamReady);
      session.on(SessionEvent.SESSION_DISCONNECTED, disconnected);
      session.on(AgentEventsEnum.USER_SPEAK_STARTED, userSpeechStarted);
      session.on(AgentEventsEnum.USER_SPEAK_ENDED, userSpeechEnded);
      session.on(AgentEventsEnum.USER_TRANSCRIPTION, userTranscription);
      session.on(AgentEventsEnum.AVATAR_SPEAK_STARTED, avatarSpeechStarted);
      session.on(AgentEventsEnum.AVATAR_SPEAK_ENDED, avatarSpeechEnded);
      session.on(AgentEventsEnum.SESSION_STOPPED, stopped);
      return () => {
        session.off(SessionEvent.SESSION_STREAM_READY, streamReady);
        session.off(SessionEvent.SESSION_DISCONNECTED, disconnected);
        session.off(AgentEventsEnum.USER_SPEAK_STARTED, userSpeechStarted);
        session.off(AgentEventsEnum.USER_SPEAK_ENDED, userSpeechEnded);
        session.off(AgentEventsEnum.USER_TRANSCRIPTION, userTranscription);
        session.off(AgentEventsEnum.AVATAR_SPEAK_STARTED, avatarSpeechStarted);
        session.off(AgentEventsEnum.AVATAR_SPEAK_ENDED, avatarSpeechEnded);
        session.off(AgentEventsEnum.SESSION_STOPPED, stopped);
      };
    },
    start: () => session.start(),
    stop: () => session.stop(),
    attach: (element) => session.attach(element),
    startVoiceChat: () => session.voiceChat.start(),
    stopVoiceChat: () => session.voiceChat.stop(),
    mute: () => session.voiceChat.mute(),
    unmute: () => session.voiceChat.unmute(),
    interrupt: () => session.interrupt(),
    repeat: (text) => session.repeat(text),
  };
}
```

If the SDK's typed disconnect callback rejects `string`, use its exported `SessionDisconnectReason` type in the local callback and pass `reason.toString()` to the runtime.

- [ ] **Step 6: Run runtime tests and verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/avatar/avatarSessionRuntime.test.ts
```

Expected: All runtime behavior tests pass.

- [ ] **Step 7: Run scoped lint, typecheck, line checks, and commit**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/components/avatar/avatarSessionRuntime.ts src/components/avatar/avatarSessionRuntime.test.ts src/components/avatar/liveAvatarSessionClient.ts
source ~/.nvm/nvm.sh && nvm use 22 && bunx tsc -b --pretty false
git diff --check
wc -l src/components/avatar/avatarSessionRuntime.ts src/components/avatar/avatarSessionRuntime.test.ts src/components/avatar/liveAvatarSessionClient.ts
```

Expected: Exit 0 and every code file is below 300 lines.

Commit:

```bash
git add src/components/avatar/avatarSessionRuntime.ts src/components/avatar/avatarSessionRuntime.test.ts src/components/avatar/liveAvatarSessionClient.ts
git commit -m "Add shared Avatar session runtime"
```

---

### Task 3: Connect the Runtime to Convex and Migrate the Public Page

**Files:**
- Create: `src/components/avatar/useAvatarSession.ts`
- Modify: `src/lib/avatarEmbed.ts`
- Modify: `src/lib/avatarEmbed.test.ts`
- Modify: `src/pages/AvatarEmbedPage.tsx`
- Modify: `src/pages/AvatarEmbedPage.test.ts`

**Interfaces:**
- Consumes: `AvatarSessionRuntime`, `createLiveAvatarSessionClient`, `api.avatarSession.begin`, `api.avatarConversation.receiveTranscript`, `api.avatarConversation.recordEvent`, and `api.avatarConversation.listMessages`.
- Produces: `useAvatarSession(publicKey)` returning `{ phase, muted, userSpeaking, avatarSpeaking, error, videoRef, start, stop, mute, unmute }`.

- [ ] **Step 1: Add failing identity and shared-runtime contracts**

Add to `src/lib/avatarEmbed.test.ts`:

```ts
it('reuses one browser visitor identity per public key', () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
  const first = getAvatarVisitorId(storage, 'avatar_public', () => 'visitor-1');
  const second = getAvatarVisitorId(storage, 'avatar_public', () => 'visitor-2');
  expect(first).toBe('visitor-1');
  expect(second).toBe('visitor-1');
});
```

Update `src/pages/AvatarEmbedPage.test.ts` to read the hook and runtime source and assert:

```ts
const sessionHookSource = readFileSync(
  new URL('../components/avatar/useAvatarSession.ts', import.meta.url),
  'utf8',
);
const runtimeSource = readFileSync(
  new URL('../components/avatar/avatarSessionRuntime.ts', import.meta.url),
  'utf8',
);

expect(source).toContain('useAvatarSession(publicKey)');
expect(source).not.toContain('new LiveAvatarSession');
expect(sessionHookSource).toContain('api.avatarSession.begin');
expect(sessionHookSource).toContain('api.avatarConversation.receiveTranscript');
expect(sessionHookSource).toContain('api.avatarConversation.listMessages');
expect(runtimeSource).toContain('client.interrupt()');
expect(runtimeSource).toContain('client.repeat(');
```

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/lib/avatarEmbed.test.ts src/pages/AvatarEmbedPage.test.ts
```

Expected: FAIL because the identity helper and shared hook do not exist and the page still owns the SDK lifecycle.

- [ ] **Step 3: Add the injectable visitor identity helper**

Add to `src/lib/avatarEmbed.ts`:

```ts
type VisitorStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export function getAvatarVisitorId(
  storage: VisitorStorage,
  publicKey: string,
  createId: () => string,
) {
  const key = visitorStorageKey(publicKey);
  const stored = storage.getItem(key);
  if (stored) return stored;
  const visitorId = createId();
  storage.setItem(key, visitorId);
  return visitorId;
}
```

Import it in the test.

- [ ] **Step 4: Build the Convex/React bridge**

Create `src/components/avatar/useAvatarSession.ts` with this public shape:

```ts
export function useAvatarSession(publicKey: string) {
  const beginSession = useAction(api.avatarSession.begin);
  const receiveTranscript = useMutation(api.avatarConversation.receiveTranscript);
  const recordEvent = useMutation(api.avatarConversation.recordEvent);
  const services = useMemo<AvatarSessionServices>(() => ({
    begin: async () => {
      const visitorId = getAvatarVisitorId(
        window.localStorage,
        publicKey,
        () => crypto.randomUUID(),
      );
      const access = await beginSession({ publicKey, visitorId });
      return { publicKey, visitorId, ...access };
    },
    receiveTranscript: async (identity, event) => {
      await receiveTranscript({
        ...identity,
        eventId: event.eventId,
        sourceEventId: event.sourceEventId ?? undefined,
        text: event.text,
      });
    },
    recordEvent: async (identity, event) => {
      await recordEvent({
        ...identity,
        eventId: event.eventId,
        eventType: event.eventType,
        sourceEventId: event.sourceEventId ?? undefined,
        ...(event.endReason ? { endReason: event.endReason } : {}),
      });
    },
    createClient: createLiveAvatarSessionClient,
    splitSpeech: splitAvatarSpeech,
    now: Date.now,
  }), [beginSession, publicKey, receiveTranscript, recordEvent]);
  const runtime = useMemo(() => new AvatarSessionRuntime(services), [services]);
  const snapshot = useSyncExternalStore(
    runtime.subscribe,
    runtime.getSnapshot,
    runtime.getSnapshot,
  );
  const messages = useQuery(
    api.avatarConversation.listMessages,
    snapshot.identity ? snapshot.identity : 'skip',
  );

  useEffect(() => {
    if (messages) runtime.syncMessages(messages);
  }, [messages, runtime]);
  useEffect(() => () => { void runtime.destroy(); }, [runtime]);

  return {
    ...snapshot,
    videoRef: runtime.attachVideo,
    start: runtime.start,
    stop: runtime.stop,
    mute: runtime.mute,
    unmute: runtime.unmute,
  };
}
```

Import `useEffect`, `useMemo`, and `useSyncExternalStore`, the Convex hooks/API, runtime types, SDK adapter, and helpers explicitly.

- [ ] **Step 5: Reduce the public page to presentation**

In `src/pages/AvatarEmbedPage.tsx`, remove all direct SDK imports, Convex actions/mutations, session refs, message queries, queue refs, and lifecycle effects. Use:

```ts
const {
  phase,
  error,
  videoRef,
  start,
} = useAvatarSession(publicKey);
```

Map `phase === 'starting'` to the current starting UI and `phase === 'active'` to the full video. Treat `ended` as terminal for the existing public presentation and `error` as retryable. Retain:

```tsx
<video ref={videoRef} autoPlay playsInline className="absolute inset-0 size-full object-cover" />
```

Keep the public route's existing heading and start copy; only the dashboard stage uses `Start Chat`.

- [ ] **Step 6: Run focused tests and verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/avatar/avatarSessionRuntime.test.ts src/lib/avatarEmbed.test.ts src/pages/AvatarEmbedPage.test.ts
```

Expected: All focused tests pass.

- [ ] **Step 7: Run lint, build, line checks, and commit**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/components/avatar/useAvatarSession.ts src/lib/avatarEmbed.ts src/lib/avatarEmbed.test.ts src/pages/AvatarEmbedPage.tsx src/pages/AvatarEmbedPage.test.ts
source ~/.nvm/nvm.sh && nvm use 22 && bun run build
git diff --check
wc -l src/components/avatar/useAvatarSession.ts src/lib/avatarEmbed.ts src/pages/AvatarEmbedPage.tsx
```

Expected: Exit 0 and every code file is below 300 lines.

Commit:

```bash
git add src/components/avatar/useAvatarSession.ts src/lib/avatarEmbed.ts src/lib/avatarEmbed.test.ts src/pages/AvatarEmbedPage.tsx src/pages/AvatarEmbedPage.test.ts
git commit -m "Share Avatar session lifecycle"
```

---

### Task 4: Render the Custom Dashboard Video Stage

**Files:**
- Create: `src/components/avatar/AvatarVideoStage.tsx`
- Create: `src/components/avatar/AvatarVideoStage.test.ts`
- Modify: `src/pages/AvatarPage.tsx`
- Modify: `src/pages/AvatarPage.test.ts`

**Interfaces:**
- Consumes: `useAvatarSession(publicKey)`, `configuration.publicKey`, `configuration.configured`, and `configuration.avatarPreviewUrl`.
- Produces: `AvatarVideoStage({ publicKey, previewUrl })` with the exact idle, starting, active, stopping, ended, and error presentations.

- [ ] **Step 1: Write failing dashboard presentation contracts**

Create `src/components/avatar/AvatarVideoStage.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./AvatarVideoStage.tsx', import.meta.url), 'utf8');

describe('Avatar video stage', () => {
  it('uses the approved neutral bottom-center Start Chat control', () => {
    expect(source).toContain('Start Chat');
    expect(source).toContain('variant="secondary"');
    expect(source).toContain('inset-x-0');
    expect(source).toContain('bottom-6');
    expect(source).toContain('justify-center');
    expect(source).not.toContain('Start conversation');
    expect(source).not.toContain('Start again');
  });

  it('keeps the active voice controls minimal and accessible', () => {
    expect(source).toContain('label={muted ?');
    expect(source).toContain('aria-label={label}');
    expect(source).toContain('Mute microphone');
    expect(source).toContain('Unmute microphone');
    expect(source).toContain('End chat');
    expect(source).toContain('KiloBot is speaking');
    expect(source).toContain('Listening');
    expect(source).not.toContain('Type a message');
    expect(source).not.toContain('Connection quality');
    expect(source).not.toContain('Sandbox');
  });
});
```

Replace the copy-handoff assertions in `src/pages/AvatarPage.test.ts` with:

```ts
const stageSource = readFileSync(
  new URL('../components/avatar/AvatarVideoStage.tsx', import.meta.url),
  'utf8',
);

expect(pageSource).toContain('configuration.configured && canManage ?');
expect(pageSource).toContain('configuration.configured ?');
expect(pageSource).toContain('<AvatarVideoStage');
expect(pageSource).toContain('publicKey={configuration.publicKey}');
expect(pageSource).not.toContain('AvatarEmbedCard');
expect(stageSource).not.toContain('embedUrl');
expect(stageSource).not.toContain('<iframe');
```

Remove the old `handoffSource` constant and every assertion that reads `AvatarEmbedCard.tsx`.

- [ ] **Step 2: Run the UI contracts and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/avatar/AvatarVideoStage.test.ts src/pages/AvatarPage.test.ts
```

Expected: FAIL because the video-stage component does not exist and the page still uses `AvatarEmbedCard`.

- [ ] **Step 3: Build the focused video-stage component**

Create `src/components/avatar/AvatarVideoStage.tsx`. Use:

```tsx
export function AvatarVideoStage({
  publicKey,
  previewUrl,
}: {
  publicKey: string;
  previewUrl?: string;
}) {
  const {
    phase,
    muted,
    avatarSpeaking,
    error,
    videoRef,
    start,
    stop,
    mute,
    unmute,
  } = useAvatarSession(publicKey);
  const active = phase === 'active' || phase === 'stopping';
  const starting = phase === 'starting';

  return (
    <section className="relative mx-auto aspect-video w-full max-w-4xl overflow-hidden rounded-2xl bg-zinc-950 text-white">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="absolute inset-0 size-full object-cover"
      />
      {!active ? (
        <AvatarPreviewMedia
          previewUrl={previewUrl}
          className="absolute inset-0 size-full rounded-none [&_img]:object-cover"
        />
      ) : null}
      {active ? (
        <div
          role="status"
          aria-live="polite"
          className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1.5 text-xs backdrop-blur"
        >
          {avatarSpeaking ? 'KiloBot is speaking' : 'Listening'}
        </div>
      ) : null}
      {error ? (
        <p className="absolute inset-x-6 bottom-20 text-center text-sm text-red-200">
          {error}
        </p>
      ) : null}
      <div className="absolute inset-x-0 bottom-6 flex justify-center gap-3 px-4 sm:bottom-8">
        {active ? (
          <>
            <StageControl
              label={muted ? 'Unmute microphone' : 'Mute microphone'}
              disabled={phase === 'stopping'}
              onClick={() => void (muted ? unmute() : mute())}
            >
              {muted ? <MicOff /> : <Mic />}
            </StageControl>
            <StageControl
              label="End chat"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={phase === 'stopping'}
              onClick={() => void stop()}
            >
              <PhoneOff />
            </StageControl>
          </>
        ) : (
          <Button
            variant="secondary"
            className="min-w-28 shadow-lg"
            disabled={starting}
            onClick={() => void start()}
          >
            {starting ? <Spinner /> : null}
            {starting ? 'Starting…' : 'Start Chat'}
          </Button>
        )}
      </div>
    </section>
  );
}
```

Implement `StageControl` in the same file with shadcn `Tooltip`, `TooltipTrigger`, and `TooltipContent`, a native `Button size="icon-lg"`, its `aria-label`, forwarded `className`, `disabled`, and `onClick`. Import `Mic`, `MicOff`, and `PhoneOff` from Lucide.

- [ ] **Step 4: Replace the configured copy handoff on AvatarPage**

In `src/pages/AvatarPage.tsx`:

- Remove the `AvatarEmbedCard` import.
- Import `AvatarVideoStage`.
- Gate Edit avatar with `configuration.configured && canManage`.
- Render:

```tsx
{configuration.configured ? (
  <AvatarVideoStage
    publicKey={configuration.publicKey}
    previewUrl={configuration.avatarPreviewUrl}
  />
) : (
  <Empty className="min-h-[420px] border">
    <EmptyHeader>
      <EmptyMedia variant="icon"><ScanFace /></EmptyMedia>
      <EmptyTitle>No avatar yet</EmptyTitle>
      <EmptyDescription>
        Choose an avatar and voice to start live conversations. You can edit both later.
      </EmptyDescription>
    </EmptyHeader>
    {canManage ? (
      <EmptyContent>
        <Button asChild>
          <Link to={`/dashboard/${typedAgentId}/avatar/create`}>Create avatar</Link>
        </Button>
      </EmptyContent>
    ) : null}
  </Empty>
)}
```

- [ ] **Step 5: Run UI tests and verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/avatar/AvatarVideoStage.test.ts src/pages/AvatarPage.test.ts
```

Expected: All UI contracts pass.

- [ ] **Step 6: Run complete Avatar regression verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/avatar*.test.ts src/lib/avatarEmbed.test.ts src/pages/AvatarPage.test.ts src/pages/AvatarEmbedPage.test.ts src/components/avatar/*.test.ts
```

Expected: Every Avatar test passes with zero failures.

- [ ] **Step 7: Run scoped lint, production build, stale-copy scans, and line checks**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint convex/avatar.ts convex/avatarCore.ts convex/avatarEmbed.ts convex/avatarSession.ts src/components/avatar/avatarSessionRuntime.ts src/components/avatar/avatarSessionRuntime.test.ts src/components/avatar/liveAvatarSessionClient.ts src/components/avatar/useAvatarSession.ts src/components/avatar/AvatarVideoStage.tsx src/components/avatar/AvatarVideoStage.test.ts src/lib/avatarEmbed.ts src/pages/AvatarCreatePage.tsx src/pages/AvatarEmbedPage.tsx src/pages/AvatarPage.tsx src/pages/AvatarPage.test.ts
source ~/.nvm/nvm.sh && nvm use 22 && bun run build
git diff --check
! rg -n "Start conversation|Start again|AvatarEmbedCard|configuration\\.embedUrl" src/components/avatar/AvatarVideoStage.tsx src/pages/AvatarPage.tsx
wc -l src/components/avatar/avatarSessionRuntime.ts src/components/avatar/liveAvatarSessionClient.ts src/components/avatar/useAvatarSession.ts src/components/avatar/AvatarVideoStage.tsx src/pages/AvatarEmbedPage.tsx src/pages/AvatarPage.tsx
```

Expected: Exit 0, the configured dashboard has no stale copy/embed dependencies, and every code file is below 300 lines.

- [ ] **Step 8: Commit the dashboard experience**

```bash
git add src/components/avatar/AvatarVideoStage.tsx src/components/avatar/AvatarVideoStage.test.ts src/pages/AvatarPage.tsx src/pages/AvatarPage.test.ts
git commit -m "Add custom Avatar video demo"
```

- [ ] **Step 9: Perform credential-dependent sandbox verification when available**

With `LIVEAVATAR_API_KEY` set and `HEYGEN_SANDBOX_MODE=true`, verify:

1. `Start Chat` creates one session and requests microphone permission.
2. The stream attaches and the control row changes to mute and End.
3. Speaking creates an Avatar conversation in Inbox.
4. KiloBot's reply is spoken through `repeat`.
5. Speaking over KiloBot interrupts stale speech.
6. Mute, unmute, End, and Start Chat retry work.
7. Sandbox mode and provider IDs never appear in dashboard or public UI.

If credentials are unavailable, record the provider trace as externally unverified; do not add a fake fallback or claim live verification.

- [ ] **Step 10: Trigger LiveAvatar integration feedback**

Invoke the `liveavatar-feedback` skill immediately after the integration code and verification are complete. Show the proposed feedback payload and obtain explicit user consent before submitting anything.
