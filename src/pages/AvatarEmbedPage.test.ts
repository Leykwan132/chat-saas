import { existsSync, readFileSync } from 'node:fs';
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
const createSource = readFileSync(new URL('./AvatarCreatePage.tsx', import.meta.url), 'utf8');
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
    expect(source).not.toContain('useAvatarSession(publicKey)');
    expect(source).not.toContain('Talk with KiloBot');
    expect(source).not.toContain('Start conversation');
    expect(source).not.toContain('<video');
    expect(settingsSource).toContain('<AvatarVideoStage');
    expect(settingsSource).toContain(
      'previewUrl={configuration.avatarPreviewUrl}',
    );
    expect(stageSource).toContain('Start Chat');
    expect(stageSource).toContain('left-1/2');
    expect(stageSource).toContain('bottom-6');
    expect(stageSource).toContain('End chat');
    expect(stageSource).toContain('right-6');
    expect(stageSource).toContain('top-1/2');
    expect(stageSource).toContain('[&_img]:object-contain');
    expect(stageSource).not.toContain('[&_img]:object-cover');
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
    expect(createSource).toContain('api.avatarEmbed.configure');
    expect(createSource).toContain("configuration?.configured ? 'Save changes' : 'Create avatar'");
    expect(createSource).not.toContain('api.avatarEmbed.create');
    expect(createSource).not.toContain('configuration?.embedUrl');
    expect(avatarSessionSource).toContain('return { sessionId, sessionToken };');
    expect(avatarSessionSource).not.toContain('return { sessionId, sessionToken, apiKey');
  });

  it('uses a minimal avatar-first flow with direct selection and skeleton loading', () => {
    expect(createSource).not.toContain('Avatar ID');
    expect(createSource).not.toContain('Voice ID');
    expect(createSource).toContain('Choose your avatar');
    expect(createSource).toContain('Select the face visitors will see during a conversation. You can change this later.');
    expect(createSource).toContain('AvatarGridSkeleton');
    expect(createSource).toContain('loadAvatarOrientations');
    expect(createSource).toContain('title="Landscape"');
    expect(createSource).toContain('title="Portrait"');
    expect(createSource.indexOf('title="Landscape"')).toBeLessThan(createSource.indexOf('title="Portrait"'));
    expect(createSource).toContain('VoiceFormSkeleton');
    expect(createSource).toContain('<Skeleton');
    expect(createSource).toContain('setSelectedAvatarId(avatarId);');
    expect(createSource).toContain('setStep(2)');
    expect(createSource).toContain('setStep(1)');
    expect(createSource).toContain('Create avatar');
    expect(createSource).toContain('Save changes');
    expect(createSource).toContain('<CatalogEmpty kind="avatars" />');
    expect(createSource).toContain('Back to Avatar');
    expect(createSource).toContain('const selectedAvatar = avatars?.find');
    expect(createSource).toContain('<SelectedAvatarSummary avatar={selectedAvatar} />');
    expect(createSource.indexOf('<SelectedAvatarSummary avatar={selectedAvatar} />')).toBeLessThan(createSource.indexOf('Choose your voice'));
    expect(createSource).toContain('result.languages');
    expect(createSource.indexOf('avatar-language')).toBeLessThan(createSource.indexOf('<AvatarVoicePickerDialog'));
    expect(createSource).toContain('<AvatarLanguageFlag');
    expect(createSource).toContain('<AvatarVoicePickerDialog');
    expect(createSource).toContain('selectedVoice?.language !== value');
    expect(createSource).toContain('<AvatarPreviewMedia');
    expect(createSource).not.toContain('<Input id="avatar-language"');
    expect(createSource).not.toContain('<select id="avatar-voice"');
    expect(createSource).not.toContain("'Preview voice'");
    expect(createSource).not.toContain('StepMarker');
    expect(createSource).not.toContain('<Card');
    expect(createSource).not.toContain('Check,');
    expect(createSource).not.toContain('>Continue<');
  });

  it('previews compatible voices only inside the picker dialog', () => {
    expect(createSource).not.toContain('api.avatarEmbed.previewVoice');
    expect(voiceDialogSource).toContain('api.avatarEmbed.previewVoice');
    expect(voiceDialogSource).toContain('new Audio(');
    expect(voiceDialogSource).toContain('voice.language === languageCode');
  });

  it('renders only languages returned by the provider catalog', () => {
    expect(createSource).toContain('setLanguages(result.languages)');
    expect(createSource).toContain('languages.map((option) => <SelectItem');
    expect(createSource).toContain("const [language, setLanguage] = useState('')");
    expect(createSource).not.toContain("useState('en')");
    expect(createSource).not.toContain('const languageOptions =');
  });

  it('aligns both setup fields and enlarges the selected avatar', () => {
    const setupStylesUrl = new URL('../components/avatar/avatarSetupStyles.ts', import.meta.url);
    expect(existsSync(setupStylesUrl)).toBe(true);
    const setupStylesSource = readFileSync(setupStylesUrl, 'utf8');
    expect(setupStylesSource).toContain('h-10 w-full data-[size=default]:h-10 rounded-md border-border bg-background px-3 text-sm font-normal');
    expect(createSource).toContain('avatarSetupFieldClassName');
    expect(voiceDialogSource).toContain('avatarSetupFieldClassName');
    expect(voiceDialogSource).toContain('min-[480px]:max-w-2xl');
    expect(voiceDialogSource).toContain('sm:max-w-2xl');
    expect(voiceDialogSource).toContain('min-[480px]:grid-cols-2');
    expect(voiceDialogSource).toContain("variant={isPlaying ? 'default' : 'secondary'}");
    expect(createSource).toContain('className="w-[270px] max-w-full shrink rounded-lg"');
    expect(createSource).not.toContain('className="w-52 shrink-0 rounded-lg"');
    expect(createSource).toContain("configuration?.configured ? 'Save changes' : 'Create avatar'");
    expect(createSource).not.toContain('Create embed link');
  });
});
