/**
 * Media markers in assistant text.
 * - Agent outputs `[MEDIA:clientId]` (preferred) or legacy `[MEDIA:https://...]`
 * - Server rewrites URLs to clientIds using mediaUploads
 * - Frontend resolves clientIds via listReadyMediaByAgent
 */
const MEDIA_MARKER_RE = /\[MEDIA:([^\]\s]+)\]/gi;
const MEDIA_URL_MARKER_RE = /\[MEDIA:(https?:\/\/[^\]\s]+)\]/gi;
const MEDIA_KEY_MARKER_RE = /\[MEDIA:(?!https?:\/\/)([^\]\s]+)\]/g;

export function extractMediaUrls(text: string): { text: string; mediaUrls: string[] } {
  const mediaUrls: string[] = [];

  const cleanText = text.replace(MEDIA_URL_MARKER_RE, (_match, url: string) => {
    mediaUrls.push(url);
    return "";
  });

  const finalText = cleanText.replace(/\n{3,}/g, "\n\n").trim();

  return { text: finalText, mediaUrls: [...new Set(mediaUrls)] };
}

export function replaceMediaUrlsWithKeys(
  text: string,
  urlToKey: Map<string, string>,
): string {
  return text
    .replace(MEDIA_URL_MARKER_RE, (_match, url: string) => {
      const key = urlToKey.get(url);
      return key ? `[MEDIA:${key}]` : "";
    })
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function extractMediaKeys(text: string): string[] {
  const keys: string[] = [];
  for (const match of text.matchAll(MEDIA_KEY_MARKER_RE)) {
    keys.push(match[1]);
  }
  return [...new Set(keys)];
}

/** Strip all media markers; collect raw URLs and clientIds separately. */
export function extractMediaFromText(text: string): {
  text: string;
  mediaUrls: string[];
  mediaClientIds: string[];
} {
  const { text: withoutUrls, mediaUrls } = extractMediaUrls(text);
  const mediaClientIds = extractMediaKeys(withoutUrls);
  const cleanText = withoutUrls
    .replace(MEDIA_KEY_MARKER_RE, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { text: cleanText, mediaUrls, mediaClientIds };
}

export function stripMediaMarkers(text: string): string {
  return text.replace(MEDIA_MARKER_RE, "").replace(/\n{3,}/g, "\n\n").trim();
}

export function inferMediaMimeType(url: string): string {
  const lower = url.split("?")[0].toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  return "image/jpeg";
}
