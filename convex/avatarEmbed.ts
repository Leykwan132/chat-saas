import { v } from 'convex/values';
import { action } from './_generated/server';
import { internal } from './_generated/api';
import {
  buildLiveAvatarEmbedRequest,
  mapPublicAvatars,
  mapPublicVoices,
  mapSupportedLanguages,
  parseSandboxMode,
  validateLanguageVoiceSelection,
} from './avatarProvider';

type ProviderResponse<T> = {
  data?: T | null;
  message?: string;
};

type ProviderAvatar = {
  id: string;
  name: string;
  status?: string;
  preview_url?: string | null;
  is_expired?: boolean;
};

type ProviderVoice = {
  id: string;
  name: string;
  language: string;
  gender: string;
  description?: string | null;
};

type ProviderLanguage = {
  language: string;
  code: string;
};

type Paginated<T> = { results: T[] };

function requireApiKey() {
  const apiKey = process.env.LIVEAVATAR_API_KEY?.trim();
  if (!apiKey) throw new Error('LIVEAVATAR_API_KEY is required');
  return apiKey;
}

async function providerRequest<T>(
  apiKey: string,
  path: string,
  options?: { method: 'POST'; body: unknown },
) {
  const response = await fetch(`https://api.liveavatar.com${path}`, {
    method: options?.method ?? 'GET',
    headers: {
      'X-API-KEY': apiKey,
      ...(options ? { 'content-type': 'application/json' } : {}),
    },
    body: options ? JSON.stringify(options.body) : undefined,
  });
  const payload = await response.json() as ProviderResponse<T>;
  if (!response.ok || payload.data === null || payload.data === undefined) {
    throw new Error(payload.message || `LiveAvatar request failed (${response.status})`);
  }
  return payload.data;
}

async function loadCatalog(apiKey: string) {
  const [avatarPage, voices, languageRecords] = await Promise.all([
    providerRequest<Paginated<ProviderAvatar>>(apiKey, '/v1/avatars/public?page=1&page_size=100'),
    loadVoices(apiKey),
    providerRequest<ProviderLanguage[]>(apiKey, '/v1/languages'),
  ]);
  return {
    avatars: mapPublicAvatars(avatarPage.results),
    voices,
    languages: mapSupportedLanguages(languageRecords),
  };
}

async function loadVoices(apiKey: string) {
  const voicePage = await providerRequest<Paginated<ProviderVoice>>(
    apiKey,
    '/v1/voices?page=1&page_size=100&voice_type=public',
  );
  return mapPublicVoices(voicePage.results);
}

export const listOptions = action({
  args: { agentId: v.id('agents') },
  handler: async (ctx, args) => {
    await ctx.runQuery(internal.avatar.internalGetSetupContext, { agentId: args.agentId });
    return await loadCatalog(requireApiKey());
  },
});

export const previewVoice = action({
  args: { agentId: v.id('agents'), voiceId: v.string() },
  handler: async (ctx, args): Promise<{ audioBase64: string }> => {
    await ctx.runQuery(internal.avatar.internalGetSetupContext, { agentId: args.agentId });
    const apiKey = requireApiKey();
    const voices = await loadVoices(apiKey);
    if (!voices.some((voice) => voice.id === args.voiceId)) {
      throw new Error('Choose an available public voice');
    }
    const preview = await providerRequest<{ audio_base64: string }>(
      apiKey,
      `/v1/voices/${encodeURIComponent(args.voiceId)}/preview`,
    );
    if (!preview.audio_base64) throw new Error('LiveAvatar voice preview is unavailable');
    return { audioBase64: preview.audio_base64 };
  },
});

export const configure = action({
  args: {
    agentId: v.id('agents'),
    avatarId: v.string(),
    voiceId: v.string(),
    language: v.string(),
  },
  handler: async (ctx, args): Promise<null> => {
    const setup = await ctx.runQuery(internal.avatar.internalGetSetupContext, {
      agentId: args.agentId,
    });
    const language = args.language.trim();
    if (!language || language.length > 5) {
      throw new Error('Choose a valid language');
    }
    const catalog = await loadCatalog(requireApiKey());
    const avatar = catalog.avatars.find((item) => item.id === args.avatarId);
    if (!avatar) throw new Error('Choose an available avatar');
    const voice = validateLanguageVoiceSelection(catalog, {
      language,
      voiceId: args.voiceId,
    });
    await ctx.runMutation(internal.avatar.saveConfiguration, {
      configurationId: setup.configurationId,
      avatarId: avatar.id,
      avatarName: avatar.name,
      ...(avatar.previewUrl ? { avatarPreviewUrl: avatar.previewUrl } : {}),
      voiceId: voice.id,
      voiceName: voice.name,
      voiceLanguage: voice.language,
      voiceGender: voice.gender,
      language,
    });
    return null;
  },
});

export const create = action({
  args: {
    agentId: v.id('agents'),
    avatarId: v.string(),
    voiceId: v.string(),
    language: v.string(),
  },
  handler: async (ctx, args): Promise<{
    embedUrl: string;
    embedScript?: string;
  }> => {
    const setup = await ctx.runQuery(internal.avatar.internalGetSetupContext, {
      agentId: args.agentId,
    });
    const language = args.language.trim();
    if (!language || language.length > 5) throw new Error('Choose a valid language');
    const apiKey = requireApiKey();
    const sandbox = parseSandboxMode(process.env.HEYGEN_SANDBOX_MODE);
    const catalog = await loadCatalog(apiKey);
    const avatar = catalog.avatars.find((item) => item.id === args.avatarId);
    if (!avatar) throw new Error('Choose an available avatar');
    const voice = validateLanguageVoiceSelection(catalog, {
      language,
      voiceId: args.voiceId,
    });

    const context = setup.contextId
      ? { id: setup.contextId }
      : await providerRequest<{ id: string }>(apiKey, '/v1/contexts', {
        method: 'POST',
        body: {
          name: `${setup.agentName} Avatar`,
          prompt: setup.systemPrompt,
          opening_text: 'Hi! How can I help you today?',
        },
      });
    if (!context.id) throw new Error('LiveAvatar context creation failed');
    const embed = await providerRequest<{
      embed_id: string;
      url: string;
      script?: string;
    }>(apiKey, '/v2/embeddings', {
      method: 'POST',
      body: buildLiveAvatarEmbedRequest({
        sandbox,
        avatarId: avatar.id,
        voiceId: voice.id,
        language,
        contextId: context.id,
      }),
    });
    if (!embed.embed_id || !embed.url) throw new Error('LiveAvatar embed creation failed');

    await ctx.runMutation(internal.avatar.saveProviderEmbed, {
      configurationId: setup.configurationId,
      avatarId: avatar.id,
      avatarName: avatar.name,
      ...(avatar.previewUrl ? { avatarPreviewUrl: avatar.previewUrl } : {}),
      voiceId: voice.id,
      voiceName: voice.name,
      voiceLanguage: voice.language,
      voiceGender: voice.gender,
      language,
      contextId: context.id,
      embedId: embed.embed_id,
      embedUrl: embed.url,
      ...(embed.script ? { embedScript: embed.script } : {}),
      isSandbox: sandbox,
    });
    return {
      embedUrl: embed.url,
      ...(embed.script ? { embedScript: embed.script } : {}),
    };
  },
});
