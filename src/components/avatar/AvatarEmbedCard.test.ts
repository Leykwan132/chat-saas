import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const cardSource = readFileSync(new URL('./AvatarEmbedCard.tsx', import.meta.url), 'utf8');

describe('AvatarEmbedCard', () => {
  it('offers HTML and React snippets for the public key', () => {
    expect(cardSource).toContain("useState<EmbedFormat>('html')");
    expect(cardSource).toContain('buildAvatarEmbedSnippet');
    expect(cardSource).toContain('buildAvatarReactEmbedSnippet');
    expect(cardSource).toContain('publicKey');
    expect(cardSource).toContain('Embed on your website');
    expect(cardSource).toContain('<Tabs');
    expect(cardSource).toContain('<TabsTrigger value="html">HTML</TabsTrigger>');
    expect(cardSource).toContain('<TabsTrigger value="react">React</TabsTrigger>');
    expect(cardSource).not.toContain('buildProviderEmbedSnippet');
    expect(cardSource).not.toContain('embedUrl');
  });

  it('copies the active snippet from the code surface top-right corner', () => {
    expect(cardSource).toContain('navigator.clipboard.writeText(snippet)');
    expect(cardSource).toContain('`${formatLabel} code copied`');
    expect(cardSource).toContain('Could not copy embed code');
    expect(cardSource).toContain('className="absolute right-2 top-2"');
    expect(cardSource).toContain('size="icon"');
    expect(cardSource).toContain('pr-12');
    expect(cardSource).toContain('`Copy ${formatLabel} code`');
    expect(cardSource).not.toContain('Copy code');
  });

  it('aligns with the preview through a borderless outer section', () => {
    expect(cardSource).toContain(
      '<section className="flex min-w-0 flex-col gap-4">',
    );
    expect(cardSource).not.toContain('rounded-xl border bg-card p-5');
  });
});
