const avatarEmbedBaseUrl = (
  import.meta.env.VITE_AVATAR_EMBED_BASE_URL as string | undefined
)?.trim() || 'https://kilobot.app';

export function buildProviderEmbedSnippet(embedUrl: string) {
  const source = new URL(embedUrl);
  if (source.protocol !== 'https:') throw new Error('Avatar embed URL must use HTTPS');
  const escapedSource = source.toString().replaceAll('&', '&amp;').replaceAll('"', '&quot;');
  return `<iframe src="${escapedSource}" title="KiloBot Avatar" allow="microphone; autoplay" style="width:100%;aspect-ratio:16/9;border:0"></iframe>`;
}

export function buildAvatarEmbedSnippet(publicKey: string) {
  const source = `${avatarEmbedBaseUrl}/avatar/embed/${encodeURIComponent(publicKey)}`;
  return `<iframe src="${source}" title="KiloBot Avatar" allow="microphone; autoplay" style="width:100%;aspect-ratio:16/9;border:0"></iframe>`;
}

export function visitorStorageKey(publicKey: string) {
  return `kilobot:avatar:${publicKey}:visitor`;
}

type VisitorStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export function getAvatarVisitorId(
  storage: VisitorStorage,
  publicKey: string,
  createId: () => string,
) {
  const key = visitorStorageKey(publicKey);
  const stored = storage.getItem(key);
  if (stored) return stored;
  const visitorId = createId();
  storage.setItem(key, visitorId);
  return visitorId;
}

export function splitAvatarSpeech(text: string) {
  const normalized = text.trim().replace(/\s+/g, ' ');
  if (!normalized) return [];
  return normalized.match(/[^.!?]+(?:[.!?]+|$)/g)?.map((part) => part.trim()) ?? [normalized];
}
