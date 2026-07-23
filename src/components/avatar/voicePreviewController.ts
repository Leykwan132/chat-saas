export type VoicePreviewSnapshot = {
  voiceId?: string;
  status: 'idle' | 'loading' | 'playing' | 'paused';
};

export type VoicePreviewAudio = Pick<
  HTMLAudioElement,
  'currentTime' | 'onended' | 'play' | 'pause'
>;

export class VoicePreviewController {
  private readonly createAudio: (audioBase64: string) => VoicePreviewAudio;
  private readonly emit: (snapshot: VoicePreviewSnapshot) => void;
  private readonly cache = new Map<string, string>();
  private audio?: VoicePreviewAudio;
  private voiceId?: string;
  private status: VoicePreviewSnapshot['status'] = 'idle';
  private requestVersion = 0;

  constructor(
    createAudio: (audioBase64: string) => VoicePreviewAudio,
    emit: (snapshot: VoicePreviewSnapshot) => void,
  ) {
    this.createAudio = createAudio;
    this.emit = emit;
  }

  async toggle(voiceId: string, load: () => Promise<string>) {
    if (this.voiceId === voiceId && this.audio) {
      if (this.status === 'playing') {
        this.audio.pause();
        this.status = 'paused';
        this.emit({ voiceId, status: 'paused' });
        return;
      }
      if (this.status === 'paused') {
        await this.audio.play();
        this.status = 'playing';
        this.emit({ voiceId, status: 'playing' });
        return;
      }
    }

    this.stop();
    const requestVersion = this.requestVersion;
    this.status = 'loading';
    this.emit({ voiceId, status: 'loading' });
    const cachedAudio = this.cache.get(voiceId);
    const audioBase64 = cachedAudio ?? await load();
    if (requestVersion !== this.requestVersion) return;
    this.cache.set(voiceId, audioBase64);

    const audio = this.createAudio(audioBase64);
    this.audio = audio;
    this.voiceId = voiceId;
    audio.onended = () => {
      if (this.audio === audio) this.stop();
    };
    await audio.play();
    if (requestVersion !== this.requestVersion) {
      audio.pause();
      audio.currentTime = 0;
      return;
    }
    this.status = 'playing';
    this.emit({ voiceId, status: 'playing' });
  }

  stop() {
    this.requestVersion += 1;
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio.onended = null;
    }
    this.audio = undefined;
    this.voiceId = undefined;
    this.status = 'idle';
    this.emit({ status: 'idle' });
  }
}
