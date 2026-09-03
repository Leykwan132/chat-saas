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
    expect(pageSource).toContain('<h2 className="text-base font-medium">Preview</h2>');
    expect(pageSource).toContain('<AvatarVideoStage');
    expect(pageSource).toContain('publicKey={configuration.publicKey}');
    expect(pageSource).toContain('backgroundUrl={configuration.backgroundUrl}');
    expect(pageSource).toContain('backgroundType={configuration.backgroundType}');
    expect(pageSource).toContain('coverImageUrl={configuration.coverImageUrl}');
    expect(pageSource).toContain('coverImageType={configuration.coverImageType}');
    expect(pageSource).toContain('<section className="flex min-w-0 flex-col gap-4">\n              <div className="flex flex-col gap-3">');
    expect(pageSource).toContain('<AvatarLiveLink publicKey={configuration.publicKey} />');
    expect(pageSource).toContain('<AvatarEmbedCard publicKey={configuration.publicKey} />');
    expect(pageSource).toContain('<section className="flex min-w-0 flex-col gap-4">\n              <AvatarEmbedCard publicKey={configuration.publicKey} />\n              <AvatarLiveLink publicKey={configuration.publicKey} />');
    expect(pageSource.indexOf('<AvatarEmbedCard publicKey={configuration.publicKey} />')).toBeLessThan(pageSource.indexOf('<AvatarLiveLink publicKey={configuration.publicKey} />'));
    expect(pageSource).toContain('<AvatarGeminiVoiceSelector');
    expect(pageSource).toContain('<AvatarCoverImageEditor');
    expect(pageSource).toContain('coverImageType={configuration.coverImageType}');
    expect(pageSource).toContain('<AvatarBackgroundEditor');
    expect(pageSource).toContain("import { Separator } from '@/components/ui/separator';");
    expect(pageSource).toContain('lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]');
    expect(pageSource).toContain('<Separator orientation="vertical" className="hidden lg:block" />');
    expect(pageSource).toContain('<Separator className="lg:hidden" />');
    expect(pageSource).toContain('geminiVoice={configuration.geminiVoice}');
    expect(pageSource).toContain('voiceSlot={<AvatarGeminiVoiceSelector');
    expect(pageSource.indexOf('<AvatarContextEditor')).toBeLessThan(pageSource.indexOf('<AvatarGeminiVoiceSelector'));
    expect(pageSource).not.toContain('updateSettings');
    expect(pageSource).not.toContain('enabledOverride');
    expect(pageSource).not.toContain('onEnabledChange');
    expect(stageSource).not.toContain('embedUrl');
    expect(stageSource).not.toContain('<iframe');
  });

  it('exposes the cover image editor in the overview', () => {
    const coverEditorSource = readFileSync(
      new URL('../components/avatar/AvatarCoverImageEditor.tsx', import.meta.url),
      'utf8',
    );
    expect(coverEditorSource).toContain('api.avatarCover.generateCoverUploadUrl');
    expect(coverEditorSource).toContain('api.avatarCover.saveCoverImage');
    expect(coverEditorSource).toContain('Click to replace');
    expect(pageSource).toContain("import { AvatarCoverImageEditor } from '@/components/avatar/AvatarCoverImageEditor';");
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
    expect(liveLinkSource).toContain('items-center gap-1');
    expect(liveLinkSource).not.toContain('Copy link');
    expect(liveLinkSource).not.toContain('>Preview</');
    expect(liveLinkSource).toContain('target="_blank"');
    expect(liveLinkSource).toContain('rel="noreferrer"');
  });
});
