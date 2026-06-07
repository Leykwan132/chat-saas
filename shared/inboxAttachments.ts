export const INBOX_AUDIO_PLACEHOLDER = "[User attached an audio file]";
export const INBOX_IMAGE_PLACEHOLDER = "[User attached an image]";

export type InboxAttachmentKind = "audio" | "image";

export type InboxAttachment = {
  url: string;
  mediaType: string;
  type: InboxAttachmentKind;
};

export type InboxAttachmentsProviderMetadata = {
  inbox: {
    attachments: InboxAttachment[];
  };
};

export function toInboxAttachments(options: {
  audio?: Array<{ url: string; mimeType: string }>;
  images?: Array<{ url: string; mimeType: string }>;
}): InboxAttachment[] {
  const attachments: InboxAttachment[] = [];
  for (const file of options.audio ?? []) {
    attachments.push({
      url: file.url,
      mediaType: file.mimeType,
      type: "audio",
    });
  }
  for (const image of options.images ?? []) {
    attachments.push({
      url: image.url,
      mediaType: image.mimeType,
      type: "image",
    });
  }
  return attachments;
}

export function inboxAttachmentsProviderMetadata(options: {
  audio?: Array<{ url: string; mimeType: string }>;
  images?: Array<{ url: string; mimeType: string }>;
}): InboxAttachmentsProviderMetadata | undefined {
  const attachments = toInboxAttachments(options);
  return attachments.length > 0 ? { inbox: { attachments } } : undefined;
}

export function readInboxAttachmentsFromProviderMetadata(
  providerMetadata: unknown,
): InboxAttachment[] | undefined {
  if (!providerMetadata || typeof providerMetadata !== "object") {
    return undefined;
  }
  const attachments = (
    providerMetadata as { inbox?: { attachments?: InboxAttachment[] } }
  ).inbox?.attachments;
  if (!attachments?.length) return undefined;
  return attachments;
}

export function isInboxAudioPlaceholder(text: string | undefined): boolean {
  return (text?.trim() ?? "") === INBOX_AUDIO_PLACEHOLDER;
}

export function isInboxImagePlaceholder(text: string | undefined): boolean {
  return (text?.trim() ?? "") === INBOX_IMAGE_PLACEHOLDER;
}

/** Prompt text for the AI when the inbound message has no caption. */
export function inboxPromptContent(
  content: string,
  images?: unknown[],
  files?: unknown[],
): string {
  const trimmed = content.trim();
  if (trimmed.length > 0) return trimmed;
  if ((images?.length ?? 0) > 0) return INBOX_IMAGE_PLACEHOLDER;
  if ((files?.length ?? 0) > 0) return INBOX_AUDIO_PLACEHOLDER;
  return "";
}

export type InboxAttachmentSourceMessage = {
  inboxAttachments?: InboxAttachment[];
};

export function getInboxAudioAttachments(
  message: InboxAttachmentSourceMessage,
): InboxAttachment[] {
  return (message.inboxAttachments ?? []).filter(
    (attachment) => attachment.type === "audio",
  );
}

export function getInboxImageAttachments(
  message: InboxAttachmentSourceMessage,
): InboxAttachment[] {
  return (message.inboxAttachments ?? []).filter(
    (attachment) => attachment.type === "image",
  );
}
