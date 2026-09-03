import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as avatarProvider from './avatarProvider';
import { buildGeminiLiveTokenRequest, buildLiveAvatarTokenRequest, parseSandboxMode } from './avatarProvider';

describe('LiveAvatar provider configuration', () => {
  it('configures validated metadata without creating a provider context or embedding', () => {
    const source = readFileSync(new URL('./avatarEmbed.ts', import.meta.url), 'utf8');
    const configureSource = source.slice(
      source.indexOf('export const configure = action'),
      source.indexOf('export const create = action'),
    );
    expect(configureSource).toContain('internal.avatar.saveConfiguration');
    expect(configureSource).not.toContain("'/v1/contexts'");
    expect(configureSource).not.toContain("'/v2/embeddings'");
    expect(configureSource).not.toContain('buildLiveAvatarEmbedRequest({');
    expect(configureSource).toContain("args: { agentId: v.id('agents'), avatarId: v.string() }");
    expect(configureSource).not.toContain('voiceId: v.string(),\n    language: v.string(),');
  });

  it('proxies public voice previews without exposing the API key', () => {
    const source = readFileSync(new URL('./avatarEmbed.ts', import.meta.url), 'utf8');
    expect(source).toContain("export const previewVoice = action");
    expect(source).toContain('/preview');
    expect(source).toContain('audio_base64');
    expect(source).toContain('encodeURIComponent(args.voiceId)');
  });

  it('provides catalog mapping and Embed V2 request builders', () => {
    expect(typeof (avatarProvider as Record<string, unknown>).mapPublicAvatars).toBe('function');
    expect(typeof (avatarProvider as Record<string, unknown>).mapPublicVoices).toBe('function');
    expect(typeof (avatarProvider as Record<string, unknown>).buildLiveAvatarEmbedRequest).toBe('function');
  });

  it('requires an explicit sandbox mode', () => {
    expect(() => parseSandboxMode(undefined)).toThrow('HEYGEN_SANDBOX_MODE');
    expect(() => parseSandboxMode('maybe')).toThrow('HEYGEN_SANDBOX_MODE');
    expect(parseSandboxMode('true')).toBe(true);
    expect(parseSandboxMode('false')).toBe(false);
  });

  it('forces Wayne in sandbox and omits a context', () => {
    expect(buildLiveAvatarTokenRequest({
      sandbox: true,
      avatarId: 'production-avatar',
      voiceId: 'voice-id',
      language: 'en',
    })).toEqual({
      mode: 'FULL',
      is_sandbox: true,
      avatar_id: 'dd73ea75-1218-4ef3-92ce-606d5f7fbc0a',
      max_session_duration: 60,
      avatar_persona: { voice_id: 'voice-id', language: 'en' },
    });
  });

  it('builds a sandbox Gemini Live connector token without a FULL persona', () => {
    expect(buildGeminiLiveTokenRequest({
      sandbox: true,
      avatarId: 'production-avatar',
      contextId: 'context-id',
      secretId: 'secret-id',
      voice: 'Aoede',
    })).toEqual({
      mode: 'LITE',
      is_sandbox: true,
      avatar_id: 'dd73ea75-1218-4ef3-92ce-606d5f7fbc0a',
      max_session_duration: 60,
      gemini_realtime_config: {
        secret_id: 'secret-id',
        context_id: 'context-id',
        voice: 'Aoede',
        model: 'gemini-3.1-flash-live-preview',
        temperature: 0.8,
      },
    });
  });

  it('exposes every supported Gemini Live voice', () => {
    expect(avatarProvider.GEMINI_LIVE_VOICES).toHaveLength(30);
    expect(avatarProvider.GEMINI_LIVE_VOICES).toContain('Puck');
    expect(avatarProvider.GEMINI_LIVE_VOICES).toContain('Zubenelgenubi');
  });

  it('keeps production sessions at ten minutes', () => {
    expect(buildLiveAvatarTokenRequest({
      sandbox: false,
      avatarId: 'production-avatar',
      voiceId: 'voice-id',
      language: 'en',
    }).max_session_duration).toBe(600);
    expect(avatarProvider.buildLiveAvatarEmbedRequest({
      sandbox: false,
      avatarId: 'production-avatar',
      voiceId: 'voice-id',
      language: 'en',
    }).max_session_duration).toBe(600);
  });

  it('maps only usable public avatars and friendly voice details', () => {
    expect(avatarProvider.mapPublicAvatars([
      { id: 'avatar-1', name: 'Wayne', status: 'ACTIVE', preview_url: 'https://image', is_expired: false },
      { id: 'avatar-2', name: 'Pending', status: 'DEPLOYING', preview_url: null, is_expired: false },
      { id: 'avatar-3', name: 'Expired', status: 'ACTIVE', preview_url: null, is_expired: true },
    ])).toEqual([{ id: 'avatar-1', name: 'Wayne', previewUrl: 'https://image' }]);

    expect(avatarProvider.mapPublicVoices([
      { id: 'voice-1', name: 'Calm English', language: 'en', gender: 'female', description: 'Warm and clear' },
    ])).toEqual([{
      id: 'voice-1',
      name: 'Calm English',
      language: 'en',
      gender: 'female',
      description: 'Warm and clear',
    }]);
  });

  it('maps supported languages to friendly options', () => {
    expect(avatarProvider.mapSupportedLanguages([
      { language: 'English', code: 'en' },
      { language: 'Malay', code: 'ms' },
    ])).toEqual([
      { name: 'English', code: 'en' },
      { name: 'Malay', code: 'ms' },
    ]);
  });

  it('requires a catalog language and a matching voice', () => {
    const catalog = {
      languages: [{ name: 'English', code: 'en' }],
      voices: [{ id: 'voice-en', name: 'Hope', language: 'en', gender: 'female' }],
    };
    expect(avatarProvider.validateLanguageVoiceSelection(catalog, {
      language: 'en', voiceId: 'voice-en',
    }).id).toBe('voice-en');
    expect(() => avatarProvider.validateLanguageVoiceSelection(catalog, {
      language: 'ms', voiceId: 'voice-en',
    })).toThrow('Choose an available language');
    expect(() => avatarProvider.validateLanguageVoiceSelection(catalog, {
      language: 'en', voiceId: 'voice-ms',
    })).toThrow('Choose a voice for the selected language');
  });

  it('loads languages through the protected catalog', () => {
    const source = readFileSync(new URL('./avatarEmbed.ts', import.meta.url), 'utf8');
    expect(source).toContain("providerRequest<ProviderLanguage[]>(apiKey, '/v1/languages')");
    expect(source).toContain('languages: mapSupportedLanguages(languageRecords)');
  });

  it('keeps the Gemini Live setup catalog avatar-only', () => {
    const source = readFileSync(new URL('./avatarEmbed.ts', import.meta.url), 'utf8');
    const listOptionsSource = source.slice(
      source.indexOf('export const listOptions = action'),
      source.indexOf('export const previewVoice = action'),
    );
    expect(listOptionsSource).toContain('loadAvatars(requireApiKey())');
    expect(listOptionsSource).not.toContain('loadCatalog(requireApiKey())');
  });

  it('builds a horizontal sandbox Embed V2 request without context or voice agent ids', () => {
    expect(avatarProvider.buildLiveAvatarEmbedRequest({
      sandbox: true,
      avatarId: 'selected-avatar',
      voiceId: 'selected-voice',
      language: 'en',
    })).toEqual({
      avatar_id: '65f9e3c9-d48b-4118-b73a-4ae2e3cbb8f0',
      voice_id: 'selected-voice',
      type: 'DEFAULT',
      max_session_duration: 60,
      default_language: 'en',
      is_sandbox: true,
      orientation: 'horizontal',
    });
  });
});
