export type WhatsAppHistoryDiagnosticMessage = {
  id?: string;
  from?: string;
  to?: string;
  timestamp?: string;
  type?: string;
  error?: unknown;
  errors?: unknown;
  history_context?: unknown;
  [key: string]: unknown;
};

export function logWhatsAppHistoryErrorMessage(args: {
  channelId: string;
  batchId: string;
  ingestThreadId: string;
  whatsappThreadId: string;
  message: WhatsAppHistoryDiagnosticMessage;
}) {
  console.error("[whatsapp-history] staging Meta error message", {
    channelId: args.channelId,
    batchId: args.batchId,
    ingestThreadId: args.ingestThreadId,
    whatsappThreadId: args.whatsappThreadId,
    ...whatsAppErrorMessageFields(args.message),
  });
}

export function logWhatsAppLiveErrorMessage(args: {
  source: "messages" | "message_echoes";
  phoneNumberId: string;
  message: WhatsAppHistoryDiagnosticMessage;
}) {
  console.error("[whatsapp] live ingest Meta error message", {
    source: args.source,
    phoneNumberId: args.phoneNumberId,
    ...whatsAppErrorMessageFields(args.message),
  });
}

export function isWhatsAppErrorMessage(
  message: WhatsAppHistoryDiagnosticMessage,
): boolean {
  return (
    message.type === "error" ||
    message.error !== undefined ||
    message.errors !== undefined
  );
}

// ponytail: temporary multi-image/caption probe; remove after Meta album shape is confirmed
export function logWhatsAppMultiImageEvent(args: {
  phoneNumberId: string;
  messages: WhatsAppHistoryDiagnosticMessage[];
}) {
  const imageMessages = args.messages.filter(
    (message) => message.type === "image",
  );
  if (imageMessages.length === 0) return;

  const summaries = args.messages.map(summarizeWhatsAppMessageForMultiImageLog);
  const captioned = summaries.filter((message) => message.hasCaption);

  console.warn("[whatsapp] multi-image event", {
    phoneNumberId: args.phoneNumberId,
    messageCount: args.messages.length,
    imageCount: imageMessages.length,
    captionedCount: captioned.length,
    distinctTimestamps: [
      ...new Set(
        summaries
          .map((message) => message.timestamp)
          .filter((timestamp): timestamp is string => Boolean(timestamp)),
      ),
    ],
    messages: summaries,
  });
}

function summarizeWhatsAppMessageForMultiImageLog(
  message: WhatsAppHistoryDiagnosticMessage,
) {
  const media =
    mediaFields(message.image) ??
    mediaFields(message.audio) ??
    mediaFields(message.video) ??
    mediaFields(message.document);

  return {
    externalId: message.id,
    type: message.type,
    from: message.from,
    timestamp: message.timestamp,
    payloadKeys: Object.keys(message).sort(),
    mediaKeys: media?.keys,
    mediaId: media?.id,
    hasMediaUrl: media?.hasUrl ?? false,
    mimeType: media?.mimeType,
    hasCaption: Boolean(media?.caption),
    captionLength: media?.caption?.length ?? 0,
    caption: media?.caption,
  };
}

function mediaFields(value: unknown):
  | {
      keys: string[];
      id?: string;
      hasUrl: boolean;
      mimeType?: string;
      caption?: string;
    }
  | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const media = value as Record<string, unknown>;
  return {
    keys: Object.keys(media).sort(),
    id: typeof media.id === "string" ? media.id : undefined,
    hasUrl: typeof media.url === "string" && media.url.length > 0,
    mimeType: typeof media.mime_type === "string" ? media.mime_type : undefined,
    caption: typeof media.caption === "string" ? media.caption : undefined,
  };
}

function whatsAppErrorMessageFields(message: WhatsAppHistoryDiagnosticMessage) {
  return {
    externalId: message.id,
    type: message.type,
    timestamp: message.timestamp,
    from: message.from,
    to: message.to,
    error: message.error,
    errors: message.errors,
    historyContext: message.history_context,
    payloadKeys: Object.keys(message).sort(),
  };
}
