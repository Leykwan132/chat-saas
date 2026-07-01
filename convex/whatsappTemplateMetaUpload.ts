import { getPublicMediaUrl } from "./media/r2";
import {
  assertWhatsAppTemplateMediaSpec,
  whatsappTemplateMediaFilename,
  type WhatsAppTemplateHeaderFormat,
  type WhatsAppTemplateMediaMimeType,
} from "../shared/whatsappTemplateMedia";

const DEFAULT_GRAPH_VERSION = "v25.0";

export type MetaTemplateComponent = {
  type?: unknown;
  format?: unknown;
  r2Key?: unknown;
  filename?: unknown;
  mimeType?: unknown;
  example?: unknown;
  [key: string]: unknown;
};

export function graphBase(): string {
  const version = process.env.META_GRAPH_API_VERSION || DEFAULT_GRAPH_VERSION;
  return `https://graph.facebook.com/${version}`;
}

function formatGraphError(body: unknown): string {
  return typeof body === "string" ? body : JSON.stringify(body, null, 2);
}

export async function readGraphObject(
  response: Response,
  errorPrefix: string,
): Promise<Record<string, unknown>> {
  const text = await response.text();
  let body: unknown;
  try {
    body = text.length ? JSON.parse(text) : text;
  } catch {
    body = text;
  }

  if (!response.ok) {
    throw new Error(`${errorPrefix}: ${formatGraphError(body)}`);
  }

  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw new Error(`${errorPrefix}: Meta returned an unexpected response.`);
  }

  return body as Record<string, unknown>;
}

function normalizeMetaValue(value: unknown): string {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

function getHeaderMediaFormat(
  component: MetaTemplateComponent,
): WhatsAppTemplateHeaderFormat | null {
  if (normalizeMetaValue(component.type) !== "HEADER") return null;
  const format = normalizeMetaValue(component.format);
  if (format === "DOCUMENT" || format === "IMAGE" || format === "VIDEO") return format;
  return null;
}

export function getHeaderMediaMetadata(component: MetaTemplateComponent) {
  const format = getHeaderMediaFormat(component);
  if (format === null) return null;
  const r2Key = typeof component.r2Key === "string" ? component.r2Key.trim() : "";
  const mimeType = typeof component.mimeType === "string" ? component.mimeType.trim() : "";
  if (!r2Key || !mimeType) {
    throw new Error("Header media requires stored R2 key and MIME type.");
  }
  const spec = assertWhatsAppTemplateMediaSpec(mimeType);
  if (spec.headerFormat !== format) {
    throw new Error("Header media format does not match MIME type.");
  }
  return {
    format,
    r2Key,
    mimeType: spec.mimeType,
    filename: whatsappTemplateMediaFilename(
      typeof component.filename === "string" ? component.filename : undefined,
      spec.mimeType,
    ),
  };
}

function normalizeUploadSessionPath(sessionId: string): string {
  return sessionId.startsWith("upload:") ? sessionId : `upload:${sessionId}`;
}

export async function resolveMetaAppId(token: string): Promise<string> {
  const configuredAppId = (process.env.META_APP_ID ?? "").trim();
  if (configuredAppId) {
    return configuredAppId.split("|")[0]?.trim() || configuredAppId;
  }

  const appRes = await fetch(`${graphBase()}/app`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const appData = await readGraphObject(appRes, "Meta App ID lookup failed");
  const appId = appData.id;
  if (typeof appId !== "string" || !appId.trim()) {
    throw new Error("Meta App ID could not be resolved. Please set META_APP_ID env var.");
  }
  return appId.trim();
}

export async function uploadHeaderAssetToMeta(args: {
  token: string;
  appId: string;
  r2Key: string;
  filename: string;
  mimeType: WhatsAppTemplateMediaMimeType;
}): Promise<string> {
  const response = await fetch(getPublicMediaUrl(args.r2Key));
  if (!response.ok) {
    throw new Error(`Failed to fetch header media: ${response.status} ${response.statusText}`);
  }

  const blob = await response.blob();
  if (blob.size <= 0) throw new Error("Header media file is empty.");

  const uploadParams = new URLSearchParams({
    file_name: args.filename,
    file_length: String(blob.size),
    file_type: args.mimeType,
  });

  const sessionRes = await fetch(`${graphBase()}/${args.appId}/uploads?${uploadParams}`, {
    method: "POST",
    headers: { Authorization: `OAuth ${args.token}` },
  });
  const sessionData = await readGraphObject(sessionRes, "Meta upload session start failed");
  const sessionId = sessionData.id;
  if (typeof sessionId !== "string" || !sessionId.trim()) {
    throw new Error("Meta upload session did not return an upload ID.");
  }

  const uploadRes = await fetch(`${graphBase()}/${normalizeUploadSessionPath(sessionId.trim())}`, {
    method: "POST",
    headers: {
      Authorization: `OAuth ${args.token}`,
      file_offset: "0",
    },
    body: await blob.arrayBuffer(),
  });
  const uploadData = await readGraphObject(uploadRes, "Meta header asset upload failed");
  const headerHandle = uploadData.h;
  if (typeof headerHandle !== "string" || !headerHandle.trim()) {
    throw new Error("Meta header asset upload did not return a file handle.");
  }

  return headerHandle.trim();
}
