import type { Doc } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { storeWhatsAppMediaInR2 } from "./whatsappMediaIngest";

export type InboxAudioFile = {
  url: string;
  mimeType: string;
};

const AUDIO_NAME_PATTERN = /\.(aac|m4a|mp3|ogg|opus|wav|webm)$/i;

function withAccessToken(url: string, accessToken?: string): string {
  if (!accessToken || url.includes("access_token")) {
    return url;
  }
  const parsed = new URL(url);
  parsed.searchParams.set("access_token", accessToken);
  return parsed.toString();
}

/** Graph sync attachment rows (Instagram / Messenger history). */
export function isSyncAudioAttachment(attachment: {
  mime_type?: string;
  name?: string;
}): boolean {
  return (
    (attachment.mime_type?.startsWith("audio/") ?? false) ||
    AUDIO_NAME_PATTERN.test(attachment.name ?? "")
  );
}

/** Resolve audio from Graph sync attachments — stored in inbox metadata for UI only. */
export function resolveSyncAudioFiles(
  attachments: Array<{
    mime_type?: string;
    file_url?: string;
    name?: string;
  }>,
  accessToken?: string,
): InboxAudioFile[] {
  return attachments
    .filter(isSyncAudioAttachment)
    .map((attachment) => {
      const url = attachment.file_url;
      if (!url) return null;
      return {
        url: withAccessToken(url, accessToken),
        mimeType: attachment.mime_type ?? "audio/ogg",
      };
    })
    .filter((file): file is InboxAudioFile => file !== null);
}

/** Meta webhook attachment payloads (Instagram / Messenger realtime). */
export function resolveWebhookAudioFiles(
  attachments: Array<{ type?: string; payload?: { url?: string } }>,
): InboxAudioFile[] {
  return attachments
    .filter((attachment) => attachment.type === "audio" && attachment.payload?.url)
    .map((attachment) => ({
      url: attachment.payload!.url!,
      mimeType: "audio/ogg",
    }));
}

/** WhatsApp Cloud API media id → playable URL for inbox metadata. */
export async function resolveWhatsAppAudioFiles(
  ctx: ActionCtx,
  args: {
    mediaId: string;
    mediaUrl?: string;
    mimeTypeHint?: string;
    phoneNumberId: string;
    accessToken: string;
    orgId: string;
  },
): Promise<InboxAudioFile[]> {
  return [
    await storeWhatsAppMediaInR2(ctx, {
      kind: "audio",
      ...args,
    }),
  ];
}

/** Ledger contentType when the messages table mirrors channel payloads. */
export function resolveInboxLedgerContentType(
  content: string,
  images?: unknown[],
  files?: unknown[],
): Doc<"messages">["contentType"] {
  const trimmed = content.trim();
  if ((files?.length ?? 0) > 0 && trimmed.length === 0) {
    return "file";
  }
  if ((images?.length ?? 0) > 0 && trimmed.length === 0) {
    return "image";
  }
  return "text";
}
