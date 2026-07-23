export const SANDBOX_AVATAR_ID = 'dd73ea75-1218-4ef3-92ce-606d5f7fbc0a';
export const SANDBOX_EMBED_AVATAR_ID = '65f9e3c9-d48b-4118-b73a-4ae2e3cbb8f0';
export const MAX_AVATAR_CONCURRENT_SESSIONS = 2;
export const MAX_AVATAR_SESSION_DURATION_SECONDS = 600;
const MAX_SANDBOX_AVATAR_SESSION_DURATION_SECONDS = 60;

type PublicAvatarRecord = {
  id: string;
  name: string;
  status?: string;
  preview_url?: string | null;
  is_expired?: boolean;
};

type PublicVoiceRecord = {
  id: string;
  name: string;
  language: string;
  gender: string;
  description?: string | null;
};

type SupportedLanguageRecord = {
  language: string;
  code: string;
};

type CompatibleVoice = {
  id: string;
  name: string;
  language: string;
  gender: string;
  description?: string;
};

export function mapPublicAvatars(records: PublicAvatarRecord[]) {
  return records
    .filter((record) => record.status === 'ACTIVE' && !record.is_expired)
    .map((record) => ({
      id: record.id,
      name: record.name,
      previewUrl: record.preview_url ?? undefined,
    }));
}

export function mapPublicVoices(records: PublicVoiceRecord[]) {
  return records.map((record) => ({
    id: record.id,
    name: record.name,
    language: record.language,
    gender: record.gender,
    description: record.description ?? undefined,
  }));
}

export function mapSupportedLanguages(records: SupportedLanguageRecord[]) {
  return records.map((record) => ({ code: record.code, name: record.language }));
}

export function validateLanguageVoiceSelection(
  catalog: {
    languages: Array<{ code: string; name: string }>;
    voices: CompatibleVoice[];
  },
  selection: { language: string; voiceId: string },
) {
  if (!catalog.languages.some((item) => item.code === selection.language)) {
    throw new Error('Choose an available language');
  }
  const voice = catalog.voices.find((item) => item.id === selection.voiceId);
  if (!voice || voice.language !== selection.language) {
    throw new Error('Choose a voice for the selected language');
  }
  return voice;
}

export function buildLiveAvatarEmbedRequest(args: {
  sandbox: boolean;
  avatarId: string;
  voiceId: string;
  language: string;
  contextId?: string;
}) {
  return {
    avatar_id: args.sandbox ? SANDBOX_EMBED_AVATAR_ID : args.avatarId,
    voice_id: args.voiceId,
    ...(args.contextId ? { context_id: args.contextId } : {}),
    type: 'DEFAULT',
    max_session_duration: args.sandbox
      ? MAX_SANDBOX_AVATAR_SESSION_DURATION_SECONDS
      : MAX_AVATAR_SESSION_DURATION_SECONDS,
    default_language: args.language,
    is_sandbox: args.sandbox,
    orientation: 'horizontal',
  };
}

export function parseSandboxMode(value: string | undefined) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error('HEYGEN_SANDBOX_MODE must be explicitly true or false');
}

export function buildLiveAvatarTokenRequest(args: {
  sandbox: boolean;
  avatarId: string;
  voiceId: string;
  language: string;
}) {
  return {
    mode: 'FULL',
    ...(args.sandbox ? { is_sandbox: true } : {}),
    avatar_id: args.sandbox ? SANDBOX_AVATAR_ID : args.avatarId,
    max_session_duration: args.sandbox
      ? MAX_SANDBOX_AVATAR_SESSION_DURATION_SECONDS
      : MAX_AVATAR_SESSION_DURATION_SECONDS,
    avatar_persona: {
      voice_id: args.voiceId,
      language: args.language,
    },
  };
}
