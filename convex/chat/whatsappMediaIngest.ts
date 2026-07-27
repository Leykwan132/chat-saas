import type { ActionCtx } from "../_generated/server";
import { getPublicMediaUrl, r2 } from "../media/r2";

const DEFAULT_GRAPH_VERSION = "v25.0";
const MEDIA_TYPES = {
  image: {
    maxBytes: 5 * 1024 * 1024,
    extensions: {
      "image/jpeg": "jpg",
      "image/png": "png",
    } as Record<string, string>,
  },
  audio: {
    maxBytes: 16 * 1024 * 1024,
    extensions: {
      "audio/aac": "aac",
      "audio/amr": "amr",
      "audio/mpeg": "mp3",
      "audio/mp4": "m4a",
      "audio/ogg": "ogg",
    } as Record<string, string>,
  },
};

type WhatsAppMediaKind = keyof typeof MEDIA_TYPES;

function graphVersion() {
  return process.env.META_GRAPH_API_VERSION || DEFAULT_GRAPH_VERSION;
}

function safeKeyPart(value: string): string {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error("WhatsApp media identifier is invalid");
  }
  return value;
}

function normalizeMimeType(value: string | null | undefined): string {
  return (value ?? "").split(";")[0]!.trim().toLowerCase();
}

export function resolveWhatsAppDownloadMimeType(
  kind: WhatsAppMediaKind,
  responseContentType: string | null,
  mimeTypeHint?: string,
): string {
  const responseMimeType = normalizeMimeType(responseContentType);
  if (MEDIA_TYPES[kind].extensions[responseMimeType]) {
    return responseMimeType;
  }
  if (
    responseMimeType === "" ||
    responseMimeType === "application/octet-stream"
  ) {
    return normalizeMimeType(mimeTypeHint);
  }
  return responseMimeType;
}

function assertMetaMediaUrl(value: string): URL {
  const url = new URL(value);
  const hostname = url.hostname.toLowerCase();
  if (
    url.protocol !== "https:" ||
    !["facebook.com", "fbcdn.net", "fbsbx.com"].some(
      (suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`),
    )
  ) {
    throw new Error("WhatsApp media URL host is not allowed");
  }
  return url;
}

async function retrieveMediaUrl(args: {
  mediaId: string;
  phoneNumberId: string;
  accessToken: string;
}) {
  const url = new URL(
    `https://graph.facebook.com/${graphVersion()}/${encodeURIComponent(args.mediaId)}`,
  );
  url.searchParams.set("phone_number_id", args.phoneNumberId);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${args.accessToken}` },
  });
  if (!response.ok) {
    throw new Error(
      `Failed to retrieve WhatsApp media URL: HTTP ${response.status}`,
    );
  }
  const metadata = (await response.json()) as {
    url?: string;
    mime_type?: string;
  };
  if (!metadata.url) throw new Error("WhatsApp media URL is missing");
  return { url: metadata.url, mimeType: metadata.mime_type };
}

async function downloadMedia(
  mediaUrl: string,
  accessToken: string,
): Promise<Response> {
  return await fetch(assertMetaMediaUrl(mediaUrl), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

async function readBoundedBytes(
  response: Response,
  maxBytes: number,
): Promise<Uint8Array> {
  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > maxBytes) {
    throw new Error("WhatsApp media exceeds its supported size limit");
  }
  if (!response.body) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > maxBytes) {
      throw new Error("WhatsApp media exceeds its supported size limit");
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
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error("WhatsApp media exceeds its supported size limit");
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

export async function storeWhatsAppMediaInR2(
  ctx: ActionCtx,
  args: {
    kind: WhatsAppMediaKind;
    mediaId: string;
    mediaUrl?: string;
    mimeTypeHint?: string;
    phoneNumberId: string;
    accessToken: string;
    orgId: string;
  },
): Promise<{ url: string; mimeType: string }> {
  let source = args.mediaUrl
    ? { url: args.mediaUrl, mimeType: args.mimeTypeHint }
    : await retrieveMediaUrl(args);
  let response = await downloadMedia(source.url, args.accessToken);
  if (response.status === 404 && args.mediaUrl) {
    source = await retrieveMediaUrl(args);
    response = await downloadMedia(source.url, args.accessToken);
  }
  if (!response.ok) {
    throw new Error(
      `Failed to download WhatsApp media: HTTP ${response.status}`,
    );
  }

  const config = MEDIA_TYPES[args.kind];
  const mimeType = resolveWhatsAppDownloadMimeType(
    args.kind,
    response.headers.get("content-type"),
    source.mimeType,
  );
  const extension = config.extensions[mimeType];
  if (!extension) {
    await response.body?.cancel();
    throw new Error(`Unsupported WhatsApp ${args.kind} MIME type`);
  }
  const bytes = await readBoundedBytes(response, config.maxBytes);
  const key = `inbox/${safeKeyPart(args.orgId)}/whatsapp/${args.kind}/${safeKeyPart(args.mediaId)}.${extension}`;
  await r2.store(
    ctx,
    new Blob([new Uint8Array(bytes).buffer], { type: mimeType }),
    { key },
  );
  return { url: getPublicMediaUrl(key), mimeType };
}
