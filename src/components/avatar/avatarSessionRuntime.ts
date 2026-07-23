import type {
  AvatarSessionClient,
  AvatarSessionHandlers,
  AvatarSessionMessage,
  AvatarSessionServices,
  AvatarSessionSnapshot,
  AvatarStoppedEvent,
} from './avatarSessionRuntimeTypes';

export type {
  AvatarSessionClient,
  AvatarSessionEvent,
  AvatarSessionHandlers,
  AvatarSessionIdentity,
  AvatarSessionMessage,
  AvatarSessionPhase,
  AvatarSessionServices,
  AvatarSessionSnapshot,
  AvatarStoppedEvent,
  AvatarTranscriptionEvent,
} from './avatarSessionRuntimeTypes';

const initialSnapshot: AvatarSessionSnapshot = {
  phase: 'idle',
  muted: false,
  userSpeaking: false,
  avatarSpeaking: false,
  error: null,
  identity: null,
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Avatar session failed';
}

export class AvatarSessionRuntime {
  private readonly services: AvatarSessionServices;
  private snapshot: AvatarSessionSnapshot = initialSnapshot;
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
  private voiceStarting = false;
  private cleanupPromise: Promise<void> | null = null;

  constructor(services: AvatarSessionServices) { this.services = services; }
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
    this.publish({ ...initialSnapshot, phase: 'starting' });
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
    try {
      await this.cleanup();
      this.publish({
        ...this.snapshot,
        phase: 'ended',
        muted: false,
        userSpeaking: false,
        avatarSpeaking: false,
        error: null,
      });
    } catch (error) {
      this.publish({ ...this.snapshot, phase: 'error', error: errorMessage(error) });
    }
  };

  mute = async () => {
    if (this.snapshot.phase !== 'active' || !this.client || this.snapshot.muted) return;
    await this.client.mute();
    this.publish({ ...this.snapshot, muted: true });
  };

  unmute = async () => {
    if (this.snapshot.phase !== 'active' || !this.client || !this.snapshot.muted) return;
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
    this.startSpeechDrain(this.generation, this.turn);
  };

  destroy = async () => this.stop();
  private handlers(generation: number): AvatarSessionHandlers {
    const current = () => generation === this.generation;
    return {
      streamReady: () => {
        if (!current() || !this.client || this.voiceStarting) return;
        this.voiceStarting = true;
        void this.activateVoice(generation);
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
        if (current()) void this.handleStopped(generation, event);
      },
    };
  }

  private async activateVoice(generation: number) {
    try {
      if (this.video) this.client?.attach(this.video);
      await this.client?.startVoiceChat();
      if (generation === this.generation) {
        this.publish({ ...this.snapshot, phase: 'active' });
      }
    } catch (error) {
      await this.fail(generation, error);
    } finally {
      this.voiceStarting = false;
    }
  }

  private startSpeechDrain(generation: number, turn: number) {
    void this.drainSpeech(generation, turn).catch((error) => this.fail(generation, error));
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
      if (this.pendingSpeech.length > 0) {
        this.startSpeechDrain(this.generation, this.turn);
      }
    }
  }

  private async handleStopped(generation: number, event: AvatarStoppedEvent) {
    const identity = this.snapshot.identity;
    if (!identity || generation !== this.generation) return;
    ++this.generation;
    const results = await Promise.allSettled([
      this.services.recordEvent(identity, {
        ...event,
        eventType: 'session.stopped',
        endReason: event.stopReason,
      }),
      this.cleanup(),
    ]);
    const failure = results.find((result) => result.status === 'rejected');
    if (failure?.status === 'rejected') {
      this.publish({ ...this.snapshot, phase: 'error', error: errorMessage(failure.reason) });
      return;
    }
    this.publish({ ...this.snapshot, phase: 'ended', avatarSpeaking: false });
  }

  private async fail(generation: number, error: unknown) {
    if (generation !== this.generation) return;
    const identity = this.snapshot.identity;
    const message = errorMessage(error);
    ++this.generation;
    await Promise.allSettled([
      this.cleanup(),
      identity
        ? this.services.recordEvent(identity, {
          eventId: crypto.randomUUID(),
          sourceEventId: null,
          eventType: 'session.start_failed',
          endReason: message,
        })
        : Promise.resolve(),
    ]);
    this.publish({ ...this.snapshot, phase: 'error', error: message });
  }

  private releaseSpeechWait() {
    const resolver = this.speechResolver;
    this.speechResolver = null;
    resolver?.();
  }

  private async cleanup() {
    if (this.cleanupPromise) return this.cleanupPromise;
    const client = this.client;
    const unbind = this.unbind;
    this.client = null;
    this.unbind = null;
    this.pendingSpeech = [];
    this.releaseSpeechWait();
    const cleanupPromise = (async () => {
      if (!client) {
        unbind?.();
        return;
      }
      client.stopVoiceChat();
      await client.stop();
      unbind?.();
    })();
    this.cleanupPromise = cleanupPromise;
    try {
      await cleanupPromise;
    } finally {
      if (this.cleanupPromise === cleanupPromise) this.cleanupPromise = null;
    }
  }

  private publish(snapshot: AvatarSessionSnapshot) {
    this.snapshot = snapshot;
    for (const listener of this.listeners) listener();
  }
}
