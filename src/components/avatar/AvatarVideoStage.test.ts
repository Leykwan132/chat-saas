import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./AvatarVideoStage.tsx', import.meta.url), 'utf8');

describe('Avatar video stage', () => {
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
    expect(source).toContain('{active && avatarSpeaking ? (');
    expect(source).toContain('KiloBot is speaking');
    expect(source).not.toContain('Listening');
    expect(source).toContain('subtitle ?');
    expect(source).toContain('text-white');
    expect(source).toContain('font-black');
    expect(source).toContain('-webkit-text-stroke:1.25px_black');
    expect(source).not.toContain('Mute microphone');
    expect(source).not.toContain('Unmute microphone');
    expect(source).not.toContain('Type a message');
    expect(source).not.toContain('Connection quality');
    expect(source).not.toContain('Sandbox');
  });
});
