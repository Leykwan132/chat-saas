import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AvatarVideoStage } from './AvatarVideoStage';

const source = readFileSync(new URL('./AvatarVideoStage.tsx', import.meta.url), 'utf8');

vi.mock('./useAvatarSession', () => ({
  useAvatarSession: () => ({
    phase: 'active',
    error: null,
    inactivityCountdown: null,
    videoRef: () => {},
    start: async () => {},
    stop: async () => {},
  }),
}));

describe('Avatar video stage', () => {
  it('supports a viewport-filling public embed mode', () => {
    expect(source).toContain('fullScreen');
    expect(source).toContain('size-full overflow-hidden bg-zinc-950 text-white');
    expect(source).toContain('aspect-video w-full');
    expect(source).not.toContain('max-w-4xl');
  });

  it('uses sandbox sessions only for the dashboard preview', () => {
    expect(source).toContain("sessionMode = 'live'");
    expect(source).toContain('useAvatarSession(publicKey, sessionMode)');
  });

  it('uses the approved neutral bottom-centered Start Chat control', () => {
    expect(source).toContain('Start Chat');
    expect(source).toContain('variant="secondary"');
    expect(source).toContain('pointer-events-auto absolute bottom-6 left-1/2 min-w-36 min-h-12 -translate-x-1/2');
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
    expect(source).toContain('coverImageType');
    expect(source).toContain('previewUrl={coverImageUrl ?? previewUrl}');
    expect(source).toContain('previewType={coverImageUrl ? coverImageType : \'image\'}');
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

  it('fills the dashboard preview with the keyed avatar layer', () => {
    const markup = renderToStaticMarkup(createElement(
      TooltipProvider,
      null,
      createElement(AvatarVideoStage, {
        publicKey: 'public-key',
        backgroundUrl: 'https://cdn.example.test/background.png',
      }),
    ));

    expect(markup).toMatch(/<canvas[^>]+object-cover/);
  });

  it('fills mobile screens while fitting the portrait to desktop height', () => {
    const markup = renderToStaticMarkup(createElement(
      TooltipProvider,
      null,
      createElement(AvatarVideoStage, {
        publicKey: 'public-key',
        backgroundUrl: 'https://cdn.example.test/background.png',
        fullScreen: true,
      }),
    ));

    expect(markup).toMatch(/<canvas[^>]+object-cover md:object-contain/);
  });

  it('can render the active avatar stream without a configured background', () => {
    const markup = renderToStaticMarkup(createElement(
      TooltipProvider,
      null,
      createElement(AvatarVideoStage, {
        publicKey: 'public-key',
        backgroundUrl: 'https://cdn.example.test/background.png',
        showBackground: false,
      }),
    ));

    expect(markup).not.toContain('background.png');
    expect(markup).not.toContain('<canvas');
  });

  it('keeps media layers from intercepting the idle Start Chat target', () => {
    expect(source).toContain('pointer-events-none');
    expect(source).toContain('z-30');
    expect(source).toContain('className="pointer-events-none absolute inset-0 z-30"');
    expect(source).toContain('pointer-events-auto');
  });

  it('shows a top-layer connection overlay and gradient-bordered Start Chat button', () => {
    expect(source).toContain('className="absolute inset-0 z-40"');
    expect(source).toContain('border-[6px] border-transparent');
    expect(source).toContain("linear-gradient(#fff, #fff) padding-box, linear-gradient(to right, #166534, #86efac) border-box");
    expect(source).toContain('bg-white');
    expect(source).toContain('text-zinc-950');
    expect(source).toContain('rounded-4xl');
  });

  it('dims the idle cover image so the start control remains the visual focus', () => {
    expect(source).toContain('bg-zinc-950/40');
    expect(source).toContain('aria-hidden="true"');
  });

  it('uses a larger horizontal green gradient for Start Chat', () => {
    expect(source).toContain('min-w-36');
    expect(source).toContain('min-h-12');
    expect(source).toContain('linear-gradient(to right');
    expect(source).not.toContain('bg-gradient-to-r');
  });
});
