const configuredAvatarEmbedBaseUrl = (
  import.meta.env.VITE_AVATAR_EMBED_BASE_URL as string | undefined
)?.trim();

type AvatarEmbedLocation = {
  hostname: string;
  origin: string;
};

function getBrowserLocation(): AvatarEmbedLocation | undefined {
  if (typeof window === 'undefined' || !window.location) return undefined;
  return { hostname: window.location.hostname, origin: window.location.origin };
}

export function resolveAvatarEmbedBaseUrl(location = getBrowserLocation()) {
  const hostname = location?.hostname.toLowerCase();
  if (location && (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]')) {
    return location.origin;
  }
  return configuredAvatarEmbedBaseUrl || 'https://kilobot.app';
}

function avatarEmbedSource(publicKey: string) {
  return `${resolveAvatarEmbedBaseUrl()}/avatar/embed/${encodeURIComponent(publicKey)}`;
}

export function buildAvatarLiveUrl(publicKey: string) {
  return avatarEmbedSource(publicKey);
}

export function buildProviderEmbedSnippet(embedUrl: string) {
  const source = new URL(embedUrl);
  if (source.protocol !== 'https:') throw new Error('Avatar embed URL must use HTTPS');
  const escapedSource = source.toString().replaceAll('&', '&amp;').replaceAll('"', '&quot;');
  return `<iframe src="${escapedSource}" title="KiloBot Avatar" allow="microphone; autoplay" style="width:100%;aspect-ratio:16/9;border:0"></iframe>`;
}

export function buildAvatarEmbedSnippet(publicKey: string) {
  const source = buildAvatarLiveUrl(publicKey);
  return `<iframe src="${source}" title="KiloBot Avatar" allow="microphone; autoplay" style="width:100%;aspect-ratio:16/9;border:0"></iframe>`;
}

export function buildAvatarReactEmbedSnippet(publicKey: string) {
  const source = buildAvatarLiveUrl(publicKey);
  return `<iframe
  src="${source}"
  title="KiloBot Avatar"
  allow="microphone; autoplay"
  style={{
    width: '100%',
    aspectRatio: '16 / 9',
    border: 0,
  }}
/>`;
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
