import type { Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

const HOUR_MS = 60 * 60 * 1000;
const successfulStatuses = new Set(["sent", "delivered", "read"]);

export async function syncWhatsAppFreeMessagingWindow(
  ctx: MutationCtx,
  previous: Doc<"messages"> | null,
  message: Doc<"messages">,
) {
  if (message.service !== "whatsapp") return;
  if (message.direction === "incoming") {
    if (!message.whatsappReferral || previous?.whatsappReferral) return;
    const conversation = await ctx.db.get(message.conversationId);
    if (!conversation || (conversation.whatsappReferralEntry?.receivedAt ?? -Infinity) >= message.createdAt) return;
    await ctx.db.patch(conversation._id, {
      whatsappReferralEntry: {
        messageId: message._id,
        receivedAt: message.createdAt,
        replyDeadlineAt: message.createdAt + 24 * HOUR_MS,
      },
    });
    return;
  }
  if (!message.externalId) return;
  if (previous?.status === message.status &&
      JSON.stringify(previous?.receiptMetadata) === JSON.stringify(message.receiptMetadata)) return;
  const conversation = await ctx.db.get(message.conversationId);
  if (!conversation) return;
  const entry = conversation.whatsappReferralEntry;
  const active = conversation.whatsappFreeMessagingWindow;
  const pricing = message.receiptMetadata?.pricing;
  const rejected = pricing !== undefined && pricing.type !== "free_entry_point";
  if (active?.replyMessageId === message._id) {
    if (message.status === "failed" || rejected) {
      await ctx.db.patch(conversation._id, {
        whatsappFreeMessagingWindow: undefined,
        ...(rejected && entry?.messageId === active.sourceMessageId
          ? { whatsappReferralEntry: undefined }
          : {}),
      });
    } else if (pricing?.type === "free_entry_point" && !active.confirmed) {
      await ctx.db.patch(conversation._id, {
        whatsappFreeMessagingWindow: { ...active, confirmed: true },
      });
    }
    return;
  }
  if (!entry || !message.status || !successfulStatuses.has(message.status) || rejected) return;
  const startedAt = message.status === "sent"
    ? message.statusUpdatedAt ?? message.createdAt
    : message.createdAt;
  if (startedAt < entry.receivedAt || startedAt >= entry.replyDeadlineAt) return;
  if (active && active.expiresAt > startedAt) return;
  await ctx.db.patch(conversation._id, {
    whatsappFreeMessagingWindow: {
      sourceMessageId: entry.messageId,
      replyMessageId: message._id,
      startedAt,
      expiresAt: startedAt + 72 * HOUR_MS,
      confirmed: pricing?.type === "free_entry_point",
    },
  });
}
