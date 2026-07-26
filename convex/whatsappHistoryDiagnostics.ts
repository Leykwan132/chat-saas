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
    externalId: args.message.id,
    type: args.message.type,
    timestamp: args.message.timestamp,
    from: args.message.from,
    to: args.message.to,
    error: args.message.error,
    errors: args.message.errors,
    historyContext: args.message.history_context,
    payloadKeys: Object.keys(args.message).sort(),
  });
}
