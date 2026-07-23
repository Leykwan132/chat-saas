import { describe, expect, it, vi } from 'vitest';
import {
  AvatarSessionRuntime,
  type AvatarSessionClient,
  type AvatarSessionHandlers,
  type AvatarSessionMessage,
} from './avatarSessionRuntime';

class FakeAvatarSessionClient implements AvatarSessionClient {
  private readonly startError?: Error;
  private readonly voiceStartError?: Error;
  boundHandlers!: AvatarSessionHandlers;
  startCalls = 0;
  stopCalls = 0;
  voiceStartCalls = 0;
  muteCalls = 0;
  unmuteCalls = 0;
  interruptCalls = 0;
  repeated: string[] = [];

  constructor(startError?: Error, voiceStartError?: Error) {
    this.startError = startError;
    this.voiceStartError = voiceStartError;
  }

  bind(handlers: AvatarSessionHandlers) {
    this.boundHandlers = handlers;
    return vi.fn();
  }

  async start() {
    this.startCalls += 1;
    if (this.startError) throw this.startError;
  }

  async stop() {
    this.stopCalls += 1;
  }

  attach() {}

  async startVoiceChat() {
    this.voiceStartCalls += 1;
    if (this.voiceStartError) throw this.voiceStartError;
  }

  stopVoiceChat() {}

  async mute() {
    this.muteCalls += 1;
  }

  async unmute() {
    this.unmuteCalls += 1;
  }

  interrupt() {
    this.interruptCalls += 1;
  }

  repeat(text: string) {
    this.repeated.push(text);
    return `speech-${this.repeated.length}`;
  }

  async emitStreamReady() {
    this.boundHandlers.streamReady();
    await settle();
  }

  emitUserSpeechStarted() {
    this.boundHandlers.userSpeechStarted();
  }

  emitUserTranscription(event: {
    eventId: string;
    sourceEventId: null;
    text: string;
  }) {
    this.boundHandlers.userTranscription(event);
  }

  async emitAvatarSpeechEnded() {
    this.boundHandlers.avatarSpeechEnded();
    await settle();
  }

  async emitDisconnected(reason: string) {
    this.boundHandlers.disconnected(reason);
    await settle();
  }
}

function settle() {
  return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

function outgoingMessage(
  id: string,
  sourceEventId: string,
  content: string,
): AvatarSessionMessage {
  return {
    id,
    direction: 'outgoing',
    content,
    contentType: 'text',
    sourceEventId,
    createdAt: 101,
  };
}

function createRuntimeHarness(options?: {
  startError?: Error;
  voiceStartError?: Error;
}) {
  const client = new FakeAvatarSessionClient(
    options?.startError,
    options?.voiceStartError,
  );
  let beginCalls = 0;
  const runtime = new AvatarSessionRuntime({
    begin: async () => {
      beginCalls += 1;
      return {
        publicKey: 'public-key',
        visitorId: 'visitor-id',
        sessionId: `session-${beginCalls}`,
        sessionToken: `token-${beginCalls}`,
      };
    },
    receiveTranscript: vi.fn(async () => undefined),
    recordEvent: vi.fn(async () => undefined),
    createClient: () => client,
    splitSpeech: (text) => text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((part) => part.trim()) ?? [],
    now: () => 100,
  });
  return {
    runtime,
    client,
    get beginCalls() {
      return beginCalls;
    },
  };
}

async function createActiveRuntimeHarness() {
  const harness = createRuntimeHarness();
  await harness.runtime.start();
  await harness.client.emitStreamReady();
  expect(harness.runtime.getSnapshot().phase).toBe('active');
  return harness;
}

describe('AvatarSessionRuntime', () => {
  it('allows only one start and activates after stream readiness', async () => {
    const harness = createRuntimeHarness();
    const first = harness.runtime.start();
    const second = harness.runtime.start();
    expect(harness.beginCalls).toBe(1);
    await settle();
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
    harness.runtime.syncMessages([
      outgoingMessage('reply-1', 'turn-1', 'First. Second.'),
    ]);
    expect(harness.client.repeated).toEqual(['First.']);
    harness.client.emitUserSpeechStarted();
    expect(harness.client.interruptCalls).toBe(1);
    await harness.client.emitAvatarSpeechEnded();
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
    expect(harness.client.repeated).toEqual(['One.', 'Two.']);
  });

  it('cleans up and exposes a retryable error when voice start fails', async () => {
    const harness = createRuntimeHarness({
      voiceStartError: new Error('Microphone denied'),
    });
    await harness.runtime.start();
    await harness.client.emitStreamReady();
    expect(harness.client.stopCalls).toBe(1);
    expect(harness.runtime.getSnapshot()).toMatchObject({
      phase: 'error',
      error: 'Microphone denied',
    });
  });

  it('cleans up and exposes a retryable error when SDK start fails', async () => {
    const harness = createRuntimeHarness({
      startError: new Error('Provider unavailable'),
    });
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
});
