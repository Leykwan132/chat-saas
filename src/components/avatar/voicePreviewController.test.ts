import { describe, expect, it, vi } from 'vitest';
import {
  VoicePreviewController,
  type VoicePreviewAudio,
  type VoicePreviewSnapshot,
} from './voicePreviewController';

function createFakeAudio(): VoicePreviewAudio {
  return {
    currentTime: 0,
    onended: null,
    play: vi.fn(async () => undefined),
    pause: vi.fn(),
  };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolver) => { resolve = resolver; });
  return { promise, resolve };
}

describe('VoicePreviewController', () => {
  it('plays, pauses, and resumes the same voice', async () => {
    const audio = createFakeAudio();
    const snapshots: VoicePreviewSnapshot[] = [];
    const controller = new VoicePreviewController(() => audio, (state) => snapshots.push(state));

    await controller.toggle('voice-1', async () => 'audio-one');
    await controller.toggle('voice-1', async () => 'audio-one');
    await controller.toggle('voice-1', async () => 'audio-one');

    expect(audio.play).toHaveBeenCalledTimes(2);
    expect(audio.pause).toHaveBeenCalledTimes(1);
    expect(snapshots.at(-1)).toEqual({ voiceId: 'voice-1', status: 'playing' });
  });

  it('stops the old audio when switching voices', async () => {
    const first = createFakeAudio();
    const second = createFakeAudio();
    const audios = [first, second];
    const controller = new VoicePreviewController(() => audios.shift()!, () => undefined);

    await controller.toggle('voice-1', async () => 'audio-one');
    first.currentTime = 8;
    await controller.toggle('voice-2', async () => 'audio-two');

    expect(first.pause).toHaveBeenCalledOnce();
    expect(first.currentTime).toBe(0);
    expect(second.play).toHaveBeenCalledOnce();
  });

  it('caches preview audio per voice', async () => {
    const load = vi.fn(async () => 'audio-one');
    const controller = new VoicePreviewController(() => createFakeAudio(), () => undefined);

    await controller.toggle('voice-1', load);
    controller.stop();
    await controller.toggle('voice-1', load);

    expect(load).toHaveBeenCalledOnce();
  });

  it('stops and resets the active audio', async () => {
    const audio = createFakeAudio();
    const snapshots: VoicePreviewSnapshot[] = [];
    const controller = new VoicePreviewController(() => audio, (state) => snapshots.push(state));
    await controller.toggle('voice-1', async () => 'audio-one');
    audio.currentTime = 4;

    controller.stop();

    expect(audio.pause).toHaveBeenCalledOnce();
    expect(audio.currentTime).toBe(0);
    expect(snapshots.at(-1)).toEqual({ status: 'idle' });
  });

  it('ignores a preview load that resolves after stop', async () => {
    const audio = createFakeAudio();
    const deferred = createDeferred<string>();
    const snapshots: VoicePreviewSnapshot[] = [];
    const controller = new VoicePreviewController(() => audio, (state) => snapshots.push(state));
    const toggle = controller.toggle('voice-1', () => deferred.promise);

    controller.stop();
    deferred.resolve('audio-one');
    await toggle;

    expect(audio.play).not.toHaveBeenCalled();
    expect(snapshots.at(-1)).toEqual({ status: 'idle' });
  });
});
