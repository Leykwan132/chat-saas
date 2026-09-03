import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const pageSource = readFileSync(new URL('./AvatarPage.tsx', import.meta.url), 'utf8');
const stageSource = readFileSync(
  new URL('../components/avatar/AvatarVideoStage.tsx', import.meta.url),
  'utf8',
);
const liveLinkSource = readFileSync(
  new URL('../components/avatar/AvatarLiveLink.tsx', import.meta.url),
  'utf8',
);

describe('Avatar configured overview', () => {
  it('presents the custom preview and website embed handoff', () => {
    expect(pageSource).toContain('font-title text-3xl font-normal');
    expect(pageSource).toContain('sm:flex-row sm:items-start sm:justify-between');
    expect(pageSource).toContain('Edit avatar');
    expect(pageSource).toContain('configuration.configured && canManage ?');
    expect(pageSource).toContain('configuration.configured ?');
    expect(pageSource).toContain('lg:grid-cols-[minmax(0,1fr)_22rem]');
    expect(pageSource).toContain('>Preview</h2>');
    expect(pageSource).toContain('<AvatarVideoStage');
    expect(pageSource).toContain('publicKey={configuration.publicKey}');
    expect(pageSource).toContain('<AvatarLiveLink publicKey={configuration.publicKey} />');
    expect(pageSource).toContain('<AvatarEmbedCard publicKey={configuration.publicKey} />');
    expect(pageSource).toContain('<section className="flex min-w-0 flex-col gap-4">\n              <AvatarEmbedCard publicKey={configuration.publicKey} />\n              <AvatarLiveLink publicKey={configuration.publicKey} />');
    expect(pageSource.indexOf('<AvatarEmbedCard publicKey={configuration.publicKey} />')).toBeLessThan(pageSource.indexOf('<AvatarLiveLink publicKey={configuration.publicKey} />'));
    expect(pageSource).toContain('<AvatarGeminiVoiceSelector');
    expect(pageSource).toContain('geminiVoice={configuration.geminiVoice}');
    expect(pageSource.indexOf('<AvatarContextEditor')).toBeLessThan(pageSource.indexOf('<AvatarGeminiVoiceSelector'));
    expect(pageSource).not.toContain('updateSettings');
    expect(pageSource).not.toContain('enabledOverride');
    expect(pageSource).not.toContain('onEnabledChange');
    expect(stageSource).not.toContain('embedUrl');
    expect(stageSource).not.toContain('<iframe');
  });

  it('offers a copyable public link and a new-tab preview', () => {
    expect(liveLinkSource).toContain('buildAvatarLiveUrl');
    expect(liveLinkSource).toContain('navigator.clipboard.writeText(url)');
    expect(liveLinkSource).toContain('Live link');
    expect(liveLinkSource).toContain('Copy live link');
    expect(liveLinkSource).toContain('className="absolute right-2 top-2"');
    expect(liveLinkSource).toContain('rounded-lg bg-muted');
    expect(liveLinkSource).toContain('pr-12');
    expect(liveLinkSource).toContain('aria-label="Open live link preview"');
    expect(liveLinkSource).toContain('title="Open live link preview"');
    expect(liveLinkSource).toContain('items-center gap-2');
    expect(liveLinkSource).not.toContain('Copy link');
    expect(liveLinkSource).not.toContain('>Preview</');
    expect(liveLinkSource).toContain('target="_blank"');
    expect(liveLinkSource).toContain('rel="noreferrer"');
  });
});
