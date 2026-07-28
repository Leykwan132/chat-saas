import { R2 } from "@convex-dev/r2";
import { components } from "../_generated/api";

// Convex env: R2_BUCKET, R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_TOKEN
// Server send path: MEDIA_CDN_BASE_URL (custom domain, no trailing slash)
// Client previews: VITE_MEDIA_CDN_BASE_URL (same origin)

export const r2 = new R2(components.r2);

const DEFAULT_MEDIA_CDN_BASE_URL = "";

export function getMediaCdnBaseUrl(): string {
  const base = process.env.MEDIA_CDN_BASE_URL ?? DEFAULT_MEDIA_CDN_BASE_URL;
  return base.replace(/\/$/, "");
}

/** Stable HTTPS URL served via the R2 custom domain. */
export function getPublicMediaUrl(r2Key: string): string {
  const base = getMediaCdnBaseUrl();
  if (!base) {
    throw new Error(
      "MEDIA_CDN_BASE_URL is not configured. Set it to your R2 custom domain.",
    );
  }
  return `${base}/${r2Key}`;
}

export function getR2KeyFromPublicMediaUrl(
  mediaUrl: string,
): string | undefined {
  const base = getMediaCdnBaseUrl();
  if (!base) return undefined;
  const prefix = `${base}/`;
  return mediaUrl.startsWith(prefix)
    ? mediaUrl.slice(prefix.length)
    : undefined;
}

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "application/pdf": "pdf",
  "video/mp4": "mp4",
};

export function generateInboxMediaKey(orgId: string, mimeType: string): string {
  const ext = MIME_TO_EXT[mimeType] ?? "bin";
  const id = crypto.randomUUID();
  return `inbox/${orgId}/${id}.${ext}`;
}
// ─── Knowledge-base image helpers ─────────────────────────

function sanitizePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
}

export function buildKnowledgeBaseImageFileName(
  collectionName: string,
  originalFileName: string,
): string {
  const collection = sanitizePathSegment(collectionName.trim());
  const trimmed = originalFileName.trim();
  if (!collection) return sanitizePathSegment(trimmed);
  if (!trimmed) return collection;

  const dotIdx = trimmed.lastIndexOf(".");
  const stem = dotIdx > 0 ? trimmed.slice(0, dotIdx) : trimmed;
  const ext =
    dotIdx > 0 ? trimmed.slice(dotIdx).replace(/[^a-zA-Z0-9.]/g, "") : "";
  const safeStem = sanitizePathSegment(stem);
  const prefix = `${collection}_`;
  const finalStem = safeStem.startsWith(prefix) ? safeStem : `${collection}_${safeStem}`;
  return `${finalStem}${ext}`;
}

export function generateKnowledgeBaseImageKey(
  orgId: string,
  agentId: string,
  collectionName: string,
  fileName: string,
): string {
  const safeCollection = sanitizePathSegment(collectionName.trim());
  const safeFileName = sanitizePathSegment(fileName.trim());
  return `knowledge-base/${orgId}/${agentId}/${safeCollection}/${safeFileName}`;
}

export function buildWorkflowMediaFileName(originalFileName: string): string {
  return sanitizePathSegment(originalFileName.trim());
}

export function generateWorkflowMediaKey(
  orgId: string,
  agentId: string,
  workflowNodeId: string,
  clientId: string,
  fileName: string,
): string {
  const safeNodeId = sanitizePathSegment(workflowNodeId.trim());
  const safeClientId = sanitizePathSegment(clientId.trim());
  const safeFileName = sanitizePathSegment(fileName.trim());
  return `workflow-media/${orgId}/${agentId}/${safeNodeId}/${safeClientId}_${safeFileName}`;
}
