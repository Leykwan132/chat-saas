import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

export const WHATSAPP_OPEN_CONNECTION_ATTEMPT_STATUSES = [
  "started",
  "signup_finished",
  "token_ready",
  "connected",
  "syncing",
] as const;

export type WhatsAppOpenConnectionAttemptStatus =
  (typeof WHATSAPP_OPEN_CONNECTION_ATTEMPT_STATUSES)[number];

export function isOpenWhatsAppConnectionAttempt(
  attempt: Pick<Doc<"whatsappConnectionAttempts">, "status">,
): boolean {
  return (WHATSAPP_OPEN_CONNECTION_ATTEMPT_STATUSES as readonly string[]).includes(
    attempt.status,
  );
}

export async function maybeCompleteWhatsAppConnectionAttempt(
  ctx: MutationCtx,
  channelId: Id<"channels">,
) {
  const channel = await ctx.db.get(channelId);
  if (channel === null || channel.service !== "whatsapp") return;

  const attempt = await ctx.db
    .query("whatsappConnectionAttempts")
    .withIndex("by_channelId", (q) => q.eq("channelId", channelId))
    .order("desc")
    .first();
  if (attempt === null || attempt.status !== "syncing") return;

  const contactDone =
    channel.contactSyncStatus === "completed" ||
    channel.contactSyncStatus === "failed";
  const historyDone =
    channel.historySyncStatus === "completed" ||
    channel.historySyncStatus === "not_shared" ||
    channel.historySyncStatus === "failed";

  if (contactDone && historyDone) {
    await ctx.db.patch(attempt._id, {
      status: "completed",
      updatedAt: Date.now(),
    });
  }
}
