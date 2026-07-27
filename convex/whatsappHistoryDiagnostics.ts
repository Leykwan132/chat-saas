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
