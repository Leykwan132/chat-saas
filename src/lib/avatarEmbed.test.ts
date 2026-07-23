import { describe, expect, it } from 'vitest';
import {
  buildAvatarEmbedSnippet,
  getAvatarVisitorId,
  splitAvatarSpeech,
  visitorStorageKey,
} from './avatarEmbed';
import * as avatarEmbed from './avatarEmbed';

describe('avatar embed helpers', () => {
  it('provides a safe provider embed snippet builder', () => {
    expect(typeof (avatarEmbed as Record<string, unknown>).buildProviderEmbedSnippet).toBe('function');
  });

  it('builds a microphone-enabled snippet from an HTTPS provider URL', () => {
    const snippet = avatarEmbed.buildProviderEmbedSnippet('https://embed.liveavatar.com/v1/embed-id');

    expect(snippet).toContain('src="https://embed.liveavatar.com/v1/embed-id"');
    expect(snippet).toContain('allow="microphone; autoplay"');
    expect(() => avatarEmbed.buildProviderEmbedSnippet('javascript:alert(1)')).toThrow('HTTPS');
  });

  it('builds a microphone-enabled responsive iframe', () => {
    const snippet = buildAvatarEmbedSnippet('av_public');

    expect(snippet).toContain('/avatar/embed/av_public');
    expect(snippet).toContain('allow="microphone; autoplay"');
    expect(snippet).toContain('aspect-ratio:16/9');
  });

  it('scopes visitor identity to the embed key', () => {
    expect(visitorStorageKey('av_public')).toBe('kilobot:avatar:av_public:visitor');
  });

  it('reuses one browser visitor identity per public key', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };
    const first = getAvatarVisitorId(storage, 'avatar_public', () => 'visitor-1');
    const second = getAvatarVisitorId(storage, 'avatar_public', () => 'visitor-2');

    expect(first).toBe('visitor-1');
    expect(second).toBe('visitor-1');
  });

  it('creates bounded speech chunks without losing text', () => {
    const chunks = splitAvatarSpeech(
      'Hello there. This is the second sentence! Is everything working?',
    );

    expect(chunks).toEqual([
      'Hello there.',
      'This is the second sentence!',
      'Is everything working?',
    ]);
  });
});
