import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./avatarBackgroundCompositor.ts', import.meta.url), 'utf8');

describe('Avatar background compositor', () => {
  it('keys the LiveAvatar stream into a transparent canvas', () => {
    expect(source).toContain('getImageData');
    expect(source).toContain('putImageData');
    expect(source).toContain('requestAnimationFrame');
    expect(source).toContain('cancelAnimationFrame');
    expect(source).toContain('minHue');
    expect(source).toContain('threshold');
  });

  it('cleans up the animation loop when the stream or session ends', () => {
    expect(source).toContain('return () =>');
    expect(source).toContain('cancelAnimationFrame');
    expect(source).toContain('sourceVideo.srcObject');
  });
});
