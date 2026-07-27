"use node";

import { Buffer } from "node:buffer";
import type { Doc } from "../_generated/dataModel";

const MAX_MEDIA_BYTES = 20 * 1024 * 1024;
const GRAPH_VERSION = "v22.0";
const META_HOST_SUFFIXES = [
  "facebook.com",
  "fbcdn.net",
  "fbsbx.com",
  "cdninstagram.com",
  "instagram.com",
];

const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const AUDIO_MIME_TYPES = new Set([
  "audio/aac",
  "audio/flac",
  "audio/m4a",
  "audio/mp4",
  "audio/mpeg",
  "audio/ogg",
  "audio/opus",
  "audio/wav",
  "audio/webm",
  "audio/x-m4a",
]);

export type FetchedInboundMedia = {
  assetKey: string;
  kind: "image" | "audio";
  mimeType: string;
  base64: string;
};

function normalizedMimeType(value: string | null | undefined): string {
  return (value ?? "application/octet-stream")
    .split(";")[0]!
    .trim()
    .toLowerCase();
}

function assertSupportedMimeType(
  kind: "image" | "audio",
  mimeType: string,
) {
  const supported =
    kind === "image"
      ? IMAGE_MIME_TYPES.has(mimeType)
      : AUDIO_MIME_TYPES.has(mimeType);
  if (!supported) {
    throw new Error(`Unsupported ${kind} MIME type`);
  }
}

export function isAllowedMetaMediaUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    return (
      url.protocol === "https:" &&
      META_HOST_SUFFIXES.some(
        (suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`),
      )
    );
  } catch {
    return false;
  }
}

function assertMetaUrl(value: string): URL {
  if (!isAllowedMetaMediaUrl(value)) {
    throw new Error("Meta media URL host is not allowed");
  }
  return new URL(value);
}

async function readBoundedBytes(response: Response): Promise<Uint8Array> {
  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > MAX_MEDIA_BYTES) {
    throw new Error("Inbound media exceeds size limit");
  }
  if (!response.body) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > MAX_MEDIA_BYTES) {
      throw new Error("Inbound media exceeds size limit");
    }
    return bytes;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_MEDIA_BYTES) {
      await reader.cancel();
      throw new Error("Inbound media exceeds size limit");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

async function fetchMedia(
  url: URL,
  kind: "image" | "audio",
  fallbackMimeType?: string,
  accessToken?: string,
): Promise<{ bytes: Uint8Array; mimeType: string }> {
  const response = await fetch(url, {
    headers: accessToken
      ? { Authorization: `Bearer ${accessToken}` }
      : undefined,
  });
  if (!response.ok) {
    throw new Error(`Inbound media fetch failed: HTTP ${response.status}`);
  }
  const mimeType = normalizedMimeType(
    response.headers.get("content-type") ?? fallbackMimeType,
  );
  assertSupportedMimeType(kind, mimeType);
  return { bytes: await readBoundedBytes(response), mimeType };
}

async function fetchWhatsAppMedia(
  mediaId: string,
  kind: "image" | "audio",
  accessToken: string,
  fallbackMimeType?: string,
) {
  const version = process.env.META_GRAPH_API_VERSION || GRAPH_VERSION;
  const metadataResponse = await fetch(
    `https://graph.facebook.com/${version}/${encodeURIComponent(mediaId)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!metadataResponse.ok) {
    throw new Error(
      `WhatsApp media metadata failed: HTTP ${metadataResponse.status}`,
    );
  }
  const metadata = (await metadataResponse.json()) as {
    url?: string;
    mime_type?: string;
  };
  if (!metadata.url) throw new Error("WhatsApp media URL is missing");
  return fetchMedia(
    assertMetaUrl(metadata.url),
    kind,
    metadata.mime_type ?? fallbackMimeType,
    accessToken,
  );
}

export async function fetchInboundMedia(
  item: Doc<"inboundMediaBatchItems">,
  accessToken?: string,
): Promise<FetchedInboundMedia> {
  const fetched = item.providerMediaId
    ? accessToken
      ? await fetchWhatsAppMedia(
          item.providerMediaId,
          item.kind,
          accessToken,
          item.mimeType,
        )
      : (() => {
          throw new Error("WhatsApp access token is missing");
        })()
    : item.providerUrl
      ? await fetchMedia(
          assertMetaUrl(item.providerUrl),
          item.kind,
          item.mimeType,
        )
      : (() => {
          throw new Error("Inbound media source is missing");
        })();

  return {
    assetKey: item.assetKey,
    kind: item.kind,
    mimeType:
      fetched.mimeType === "audio/opus" ? "audio/ogg" : fetched.mimeType,
    base64: Buffer.from(fetched.bytes).toString("base64"),
  };
}
