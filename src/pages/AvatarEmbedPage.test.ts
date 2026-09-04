import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./AvatarEmbedPage.tsx', import.meta.url), 'utf8');
const sessionHookSource = readFileSync(new URL('../components/avatar/useAvatarSession.ts', import.meta.url), 'utf8');
const runtimeSource = readFileSync(new URL('../components/avatar/avatarSessionRuntime.ts', import.meta.url), 'utf8');
const unavailableSource = readFileSync(
  new URL('../components/avatar/AvatarUnavailableState.tsx', import.meta.url),
  'utf8',
);
const settingsSource = readFileSync(new URL('./AvatarPage.tsx', import.meta.url), 'utf8');
const stageSource = readFileSync(
  new URL('../components/avatar/AvatarVideoStage.tsx', import.meta.url),
  'utf8',
);
const createSource = readFileSync(new URL('../components/avatar/AvatarSetupEditor.tsx', import.meta.url), 'utf8');
const backgroundPreviewSource = readFileSync(new URL('../components/avatar/AvatarBackgroundPreview.tsx', import.meta.url), 'utf8');
const previewMediaSource = readFileSync(new URL('../components/avatar/AvatarPreviewMedia.tsx', import.meta.url), 'utf8');
const voiceDialogSource = readFileSync(new URL('../components/avatar/AvatarVoicePickerDialog.tsx', import.meta.url), 'utf8');
const embedCardSource = readFileSync(new URL('../components/avatar/AvatarEmbedCard.tsx', import.meta.url), 'utf8');
const avatarTypesSource = readFileSync(new URL('../components/avatar/avatarTypes.ts', import.meta.url), 'utf8');
const avatarCoreSource = readFileSync(new URL('../../convex/avatarCore.ts', import.meta.url), 'utf8');
const avatarEmbedActionSource = readFileSync(new URL('../../convex/avatarEmbed.ts', import.meta.url), 'utf8');
const avatarSessionSource = readFileSync(new URL('../../convex/avatarSession.ts', import.meta.url), 'utf8');
const routerSource = readFileSync(new URL('../main.tsx', import.meta.url), 'utf8');

describe('Avatar embed runtime', () => {
  it('shares the unavailable presentation with the public feature gate', () => {
    expect(source).toContain('<AvatarUnavailableState />');
    expect(unavailableSource).toContain('Avatar unavailable');
    expect(unavailableSource).toContain(
      'This Avatar embed is disabled or no longer exists.',
    );
  });

  it('reuses the dashboard video stage with the configured preview image', () => {
    expect(source).toContain(
      "import { AvatarVideoStage } from '@/components/avatar/AvatarVideoStage';",
    );
    expect(source).toContain('<AvatarVideoStage');
    expect(source).toContain('publicKey={publicKey}');
    expect(source).toContain('previewUrl={config.avatarPreviewUrl}');
    expect(source).toContain('coverImageUrl={config.coverImageUrl}');
    expect(source).toContain('coverImageType={config.coverImageType}');
    expect(source).toContain('backgroundUrl={config.backgroundUrl}');
    expect(source).toContain('backgroundType={config.backgroundType}');
    expect(source).not.toContain('useAvatarSession(publicKey)');
    expect(source).not.toContain('Talk with KiloBot');
    expect(source).not.toContain('Start conversation');
    expect(source).not.toContain('<video');
    expect(source).toContain('h-[100dvh] w-full overflow-hidden');
    expect(source).toContain('fullScreen');
    expect(settingsSource).toContain('<AvatarVideoStage');
    expect(settingsSource).toContain(
      'previewUrl={configuration.avatarPreviewUrl}',
    );
    expect(settingsSource).toContain(
      'coverImageUrl={configuration.coverImageUrl}',
    );
    expect(stageSource).toContain('Start Chat');
    expect(stageSource).toContain('left-1/2');
    expect(stageSource).toContain('bottom-6');
    expect(stageSource).toContain('End chat');
    expect(stageSource).toContain('right-6');
    expect(stageSource).toContain('top-1/2');
    expect(stageSource).toContain('[&_img]:object-contain');
    expect(stageSource).toContain('[&_img]:object-cover');
    expect(stageSource).toContain('fullScreen');
    expect(stageSource).toContain('size-full overflow-hidden bg-zinc-950 text-white');
  });

  it('keeps Gemini-owned conversations out of the KiloBot runtime', () => {
    expect(sessionHookSource).toContain('api.avatarSession.begin');
    expect(sessionHookSource).not.toContain('api.avatarConversation.receiveTranscript');
    expect(sessionHookSource).not.toContain('api.avatarConversation.listMessages');
    expect(runtimeSource).not.toContain('this.client.repeat(');
    expect(source).not.toContain('.message(');
  });

  it('keeps connector session lifecycle events', () => {
    expect(runtimeSource).toContain('startVoiceChat');
    expect(runtimeSource).toContain('recordEvent');
  });

  it('keeps sandbox mode in the backend without exposing it in the UI or public session result', () => {
    expect(source).not.toContain('Sandbox');
    expect(source).not.toContain('access.isSandbox');
    expect(embedCardSource).not.toContain('Sandbox');
    expect(embedCardSource).not.toContain('configuration.isSandbox');
    expect(avatarTypesSource).not.toContain('isSandbox');
    expect(avatarCoreSource).not.toContain('isSandbox: configuration.providerEmbedSandbox');
    expect(avatarEmbedActionSource).not.toContain('isSandbox: boolean;');
    expect(avatarEmbedActionSource).not.toContain('return { embedUrl: embed.url, isSandbox: sandbox }');
    expect(avatarSessionSource).not.toContain('return { sessionId, sessionToken, isSandbox: sandbox }');
    expect(avatarSessionSource).toContain('isSandbox: sandbox');
  });
});

describe('Avatar setup', () => {
  it('contains portrait previews inside a horizontal frame', () => {
    expect(previewMediaSource).toContain('aspect-video');
    expect(previewMediaSource).toContain('object-contain');
    expect(previewMediaSource).toContain('previewType');
    expect(previewMediaSource).toContain('<video');
  });

  it('keeps creation on a separate route and uses an empty overview', () => {
    expect(settingsSource).not.toContain('Avatar ID');
    expect(settingsSource).not.toContain('Voice ID');
    expect(settingsSource).toContain('<Empty');
    expect(settingsSource).toContain('No avatar yet');
    expect(settingsSource).toContain('Create avatar');
    expect(routerSource).toContain('path="avatar/create"');
    expect(routerSource).toContain('<AvatarCreateFeatureRoute />');
  });

  it('persists Web SDK configuration without requiring Embed V2', () => {
    const configureSource = avatarEmbedActionSource.slice(
      avatarEmbedActionSource.indexOf('export const configure = action'),
      avatarEmbedActionSource.indexOf('export const create = action'),
    );
    expect(createSource).toContain('api.avatarEmbed.configure');
    expect(createSource).toContain("configuration?.configured ? 'Save changes' : 'Create avatar'");
    expect(createSource).not.toContain('api.avatarEmbed.create');
    expect(createSource).not.toContain('configuration?.embedUrl');
    expect(createSource).not.toContain('voiceId: selectedVoiceId');
    expect(createSource).not.toContain('language,');
    expect(configureSource).toContain("args: { agentId: v.id('agents'), avatarId: v.string() }");
    expect(configureSource).not.toContain('voiceId: v.string(),\n    language: v.string(),');
    expect(avatarSessionSource).toContain('return { sessionId, sessionToken };');
    expect(avatarSessionSource).not.toContain('return { sessionId, sessionToken, apiKey');
  });

  it('uses a Gemini Live avatar-only flow with curated catalog sections', () => {
    expect(createSource).not.toContain('Avatar ID');
    expect(createSource).not.toContain('Voice ID');
    expect(createSource).not.toContain('Choose your avatar');
    expect(createSource).not.toContain('Select the face visitors will see during a conversation. You can change this later.');
    expect(createSource).toContain('AvatarGridSkeleton');
    expect(createSource).toContain('loadAvatarOrientations');
    expect(createSource).toContain('filterBackgroundFreeAvatars');
    expect(createSource).toContain('<Tabs');
    expect(createSource).toContain('<TabsList variant="line"');
    expect(createSource).toContain('<TabsTrigger value="avatar">Avatar</TabsTrigger>');
    expect(createSource).toContain('<TabsTrigger value="background">Cover &amp; background</TabsTrigger>');
    expect(createSource).toContain("import { AvatarBackgroundPreview } from '@/components/avatar/AvatarBackgroundPreview';");
    expect(createSource).toContain('<AvatarBackgroundPreview');
    const backgroundPreviewUsage = createSource.slice(
      createSource.indexOf('<AvatarBackgroundPreview'),
      createSource.indexOf('/>', createSource.indexOf('<AvatarBackgroundPreview')) + 2,
    );
    expect(backgroundPreviewUsage).not.toContain('coverImageUrl');
    expect(backgroundPreviewSource).toContain('previewUrl');
    expect(backgroundPreviewSource).toContain('backgroundUrl');
    expect(backgroundPreviewSource).not.toContain('coverImageUrl');
    expect(createSource).toContain('title="Selected"');
    expect(createSource).toContain('selectedAvatar?.previewUrl');
    expect(createSource).toContain('<AvatarBackgroundEditor');
    expect(createSource).toContain('<AvatarCoverImageEditor');
    expect(createSource).not.toContain('defaultAvatars');
    expect(createSource).not.toContain('title="Default"');
    expect(createSource).toContain('title="Landscape"');
    expect(createSource).toContain('title="Portrait"');
    expect(createSource.indexOf('title="Landscape"')).toBeLessThan(createSource.indexOf('title="Portrait"'));
    expect(createSource).toContain('<Skeleton');
    expect(createSource).toContain('onSelect={setSelectedAvatarId}');
    expect(createSource).toContain('Create avatar');
    expect(createSource).toContain('<CatalogEmpty />');
    expect(createSource).toContain('Back to Avatar');
    expect(createSource).toContain('selectedAvatarId');
    expect(createSource).toContain('<AvatarPreviewMedia');
    expect(createSource).not.toContain('Choose your voice');
    expect(createSource).not.toContain('VoiceFormSkeleton');
    expect(createSource).not.toContain('AvatarVoicePickerDialog');
    expect(createSource).not.toContain('AvatarLanguageFlag');
    expect(createSource).not.toContain('avatar-language');
    expect(createSource).not.toContain('result.languages');
    expect(createSource).not.toContain('selectedVoiceId');
    expect(createSource).not.toContain('setStep(');
    expect(createSource).not.toContain('<Input id="avatar-language"');
    expect(createSource).not.toContain('<select id="avatar-voice"');
    expect(createSource).not.toContain("'Preview voice'");
    expect(createSource).not.toContain('StepMarker');
    expect(createSource).not.toContain('<Card');
    expect(createSource).not.toContain('Check,');
    expect(createSource).not.toContain('>Continue<');
  });

  it('keeps legacy voice preview code isolated from the Gemini Live setup', () => {
    expect(createSource).not.toContain('api.avatarEmbed.previewVoice');
    expect(createSource).not.toContain('new Audio(');
    expect(voiceDialogSource).toContain('api.avatarEmbed.previewVoice');
    expect(voiceDialogSource).toContain('new Audio(');
    expect(voiceDialogSource).toContain('voice.language === languageCode');
  });

  it('loads only the avatar catalog for Gemini Live setup', () => {
    expect(createSource).toContain('setAvatars(orientedAvatars)');
    expect(createSource).not.toContain('setVoices');
    expect(createSource).not.toContain('setLanguages');
    expect(createSource).not.toContain('const [language');
    expect(createSource).not.toContain('const [voices');
    expect(createSource).not.toContain('const [languages');
  });

  it('keeps the avatar choice cards and action sizing', () => {
    expect(createSource).not.toContain('avatarSetupFieldClassName');
    expect(createSource).toContain('grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4');
    expect(createSource).toContain("configuration?.configured ? 'Save changes' : 'Create avatar'");
    expect(createSource).not.toContain('Create embed link');
  });
});
