/**
 * Media markers in assistant text.
 * - Agent outputs `[MEDIA:clientId]` (preferred) or legacy `[MEDIA:https://...]`
 * - Server rewrites URLs to clientIds using mediaUploads
 * - Frontend resolves clientIds via listReadyMediaByAgent
 */
const MEDIA_MARKER_RE = /\[\s*MEDIA\s*:\s*([^\]\s]+)\s*\]/gi;
const MEDIA_URL_MARKER_RE = /\[\s*MEDIA\s*:\s*(https?:\/\/[^\]\s]+)\s*\]/gi;
const MEDIA_KEY_MARKER_RE = /\[\s*MEDIA\s*:\s*(?!https?:\/\/)([^\]\s]+)\s*\]/gi;

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
  if (lower.endsWith(".mp4")) return "video/mp4";
  if (lower.endsWith(".mpeg") || lower.endsWith(".mpg")) return "video/mpeg";
  if (lower.endsWith(".mov")) return "video/quicktime";
  if (lower.endsWith(".webm")) return "video/webm";
  if (lower.endsWith(".m4v")) return "video/x-m4v";
  if (lower.endsWith(".3gp")) return "video/3gpp";
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".doc")) return "application/msword";
  if (lower.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (lower.endsWith(".xls")) return "application/vnd.ms-excel";
  if (lower.endsWith(".xlsx")) {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }
  if (lower.endsWith(".ppt")) return "application/vnd.ms-powerpoint";
  if (lower.endsWith(".pptx")) {
    return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  }
  if (lower.endsWith(".txt")) return "text/plain";
  if (lower.endsWith(".csv")) return "text/csv";
  if (lower.endsWith(".zip")) return "application/zip";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  return "image/jpeg";
}
