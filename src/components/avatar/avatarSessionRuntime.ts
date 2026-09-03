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
  subtitle: null,
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
  private voiceStarting = false;
  private subtitleSourceEventId: string | null = null;
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
    this.subtitleSourceEventId = null;
    this.publish({ ...initialSnapshot, phase: 'starting' });
    try {
      const access = await this.services.begin();
      const { sessionToken, ...identity } = access;
      if (generation !== this.generation) {
        await this.recordClientStopped(identity);
        return;
      }
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
    const identity = this.snapshot.identity;
    const shouldRecordStop = Boolean(identity) && this.snapshot.phase !== 'error';
    if (this.snapshot.phase !== 'error') {
      this.publish({ ...this.snapshot, phase: 'stopping' });
    }
    ++this.generation;
    try {
      const results = await Promise.allSettled([
        this.cleanup(),
        shouldRecordStop && identity
          ? this.recordClientStopped(identity)
          : Promise.resolve(),
      ]);
      const failure = results.find((result) => result.status === 'rejected');
      if (failure?.status === 'rejected') throw failure.reason;
      this.publish({
        ...this.snapshot,
        phase: 'ended',
        muted: false,
        userSpeaking: false,
        avatarSpeaking: false,
        subtitle: null,
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

  syncMessages = (messages: AvatarSessionMessage[]) => { void messages; };

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
        this.publish({ ...this.snapshot, userSpeaking: true });
      },
      userSpeechEnded: () => {
        if (current()) this.publish({ ...this.snapshot, userSpeaking: false });
      },
      userTranscription: () => {},
      avatarSpeechStarted: () => {
        if (current()) this.publish({ ...this.snapshot, avatarSpeaking: true });
      },
      avatarSpeechEnded: () => {
        if (!current()) return;
        this.subtitleSourceEventId = null;
        this.publish({ ...this.snapshot, avatarSpeaking: false, subtitle: null });
      },
      avatarTranscription: (event) => {
        if (!current()) return;
        const sourceEventId = event.sourceEventId ?? this.subtitleSourceEventId ?? event.eventId;
        const previous = this.subtitleSourceEventId === sourceEventId
          ? this.snapshot.subtitle ?? ''
          : '';
        const text = event.isChunk ? `${previous}${event.text}` : event.text;
        this.subtitleSourceEventId = sourceEventId;
        this.publish({ ...this.snapshot, subtitle: text.trim() || null });
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
    this.subtitleSourceEventId = null;
    this.publish({ ...this.snapshot, phase: 'ended', avatarSpeaking: false, subtitle: null });
  }

  private async fail(generation: number, error: unknown) {
    if (generation !== this.generation) return;
    const identity = this.snapshot.identity;
    const message = errorMessage(error);
    ++this.generation;
    this.subtitleSourceEventId = null;
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
    this.publish({ ...this.snapshot, phase: 'error', subtitle: null, error: message });
  }

  private recordClientStopped(identity: NonNullable<AvatarSessionSnapshot['identity']>) {
    return this.services.recordEvent(identity, {
      eventId: crypto.randomUUID(),
      sourceEventId: null,
      eventType: 'session.stopped',
      endReason: 'client_ended',
    });
  }

  private async cleanup() {
    if (this.cleanupPromise) return this.cleanupPromise;
    const client = this.client;
    const unbind = this.unbind;
    this.client = null;
    this.unbind = null;
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
