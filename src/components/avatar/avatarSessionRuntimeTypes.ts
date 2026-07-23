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
