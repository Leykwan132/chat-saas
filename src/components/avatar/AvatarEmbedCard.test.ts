import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const cardSource = readFileSync(new URL('./AvatarEmbedCard.tsx', import.meta.url), 'utf8');

describe('AvatarEmbedCard', () => {
  it('builds a copyable KiloBot iframe from the public key', () => {
    expect(cardSource).toContain('buildAvatarEmbedSnippet');
    expect(cardSource).toContain('publicKey');
    expect(cardSource).toContain('Embed on your website');
    expect(cardSource).toContain('Copy code');
    expect(cardSource).toContain('Embed code copied');
    expect(cardSource).toContain('Could not copy embed code');
    expect(cardSource).not.toContain('buildProviderEmbedSnippet');
    expect(cardSource).not.toContain('embedUrl');
  });
});
