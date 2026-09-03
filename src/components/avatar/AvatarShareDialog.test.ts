import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./AvatarShareDialog.tsx', import.meta.url), 'utf8');

describe('Avatar share dialog', () => {
  it('opens from a primary Share action', () => {
    expect(source).toContain('<Dialog');
    expect(source).toContain('<DialogTrigger asChild>');
    expect(source).toContain('variant="default"');
    expect(source).toContain('Share');
    expect(source).not.toContain('variant="outline"');
  });

  it('contains the public live link and embed instructions', () => {
    expect(source).toContain('<AvatarLiveLink publicKey={publicKey} />');
    expect(source).toContain('<AvatarEmbedCard publicKey={publicKey} />');
    expect(source).toContain('Share your Avatar');
  });
});
