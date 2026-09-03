import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./AvatarVideoStage.tsx', import.meta.url), 'utf8');

describe('Avatar video stage', () => {
  it('supports a viewport-filling public embed mode', () => {
    expect(source).toContain('fullScreen');
    expect(source).toContain('size-full overflow-hidden bg-zinc-950 text-white');
    expect(source).toContain('aspect-video w-full max-w-4xl');
  });

  it('uses the approved neutral bottom-centered Start Chat control', () => {
    expect(source).toContain('Start Chat');
    expect(source).toContain('variant="secondary"');
    expect(source).toContain('absolute bottom-6 left-1/2 min-w-28 -translate-x-1/2 shadow-lg');
    expect(source).not.toContain('absolute left-1/2 top-1/2 min-w-28 -translate-x-1/2 -translate-y-1/2 shadow-lg');
    expect(source).not.toContain('Start conversation');
    expect(source).not.toContain('Start again');
  });

  it('keeps the active voice controls minimal and accessible', () => {
    expect(source).toContain('right-6');
    expect(source).toContain('top-1/2');
    expect(source).toContain('label="End chat"');
    expect(source).toContain('aria-label={label}');
    expect(source).toContain('End chat');
    expect(source).not.toContain('avatarSpeaking');
    expect(source).not.toContain('KiloBot is speaking');
    expect(source).not.toContain('Listening');
    expect(source).not.toContain('Mute microphone');
    expect(source).not.toContain('Unmute microphone');
    expect(source).not.toContain('Type a message');
    expect(source).not.toContain('Connection quality');
    expect(source).not.toContain('Sandbox');
  });

  it('omits response subtitles from the clean stage', () => {
    expect(source).not.toContain('subtitle');
    expect(source).not.toContain('-webkit-text-stroke');
  });

  it('shows the idle closing countdown at the top of the stage', () => {
    expect(source).toContain('inactivityCountdown');
    expect(source).toContain('Chat closing in');
    expect(source).toContain('absolute left-1/2 top-6 z-10 -translate-x-1/2');
    expect(source).toContain('aria-live="polite"');
  });

  it('uses the configured cover image and shows a connecting overlay', () => {
    expect(source).toContain('coverImageUrl');
    expect(source).toContain('previewUrl={coverImageUrl ?? previewUrl}');
    expect(source).toContain('Connecting...');
    expect(source).toContain('absolute inset-0 z-20 flex items-center justify-center');
    expect(source).toContain('bg-black/45');
  });

  it('composites an uploaded image or video background behind the keyed avatar stream', () => {
    expect(source).toContain('backgroundUrl');
    expect(source).toContain('backgroundType');
    expect(source).toContain('useAvatarBackgroundCompositor');
    expect(source).toContain('<canvas');
    expect(source).toContain('autoPlay');
    expect(source).toContain('loop');
    expect(source).toContain('muted');
  });

  it('keeps media layers from intercepting the idle Start Chat target', () => {
    expect(source).toContain('pointer-events-none');
    expect(source).toContain('z-30');
    expect(source).toContain('className="pointer-events-none absolute inset-0 z-30"');
    expect(source).toContain('pointer-events-auto');
  });
});
