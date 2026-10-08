import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { whatsappReferralValidator } from "./whatsappReferral";

export const customerReferralValidator = v.object({
  service: v.literal("whatsapp"),
  messageId: v.id("messages"),
  receivedAt: v.number(),
  referral: whatsappReferralValidator,
});

export async function syncCustomerReferral(
  ctx: MutationCtx,
  previous: Doc<"messages"> | null,
  message: Doc<"messages">,
) {
  if (message.service !== "whatsapp" || message.direction !== "incoming" ||
    !message.whatsappReferral || previous?.whatsappReferral) return;
  const conversation = await ctx.db.get(message.conversationId);
  if (!conversation?.customerId) return;
  const customer = await ctx.db.get(conversation.customerId);
  if (!customer) throw new Error("Referral customer does not exist");
  const referral = {
    service: "whatsapp" as const,
    messageId: message._id,
    receivedAt: message.createdAt,
    referral: message.whatsappReferral,
  };
  const patch: Partial<Doc<"customers">> = {};
  if (!customer.firstReferral || referral.receivedAt < customer.firstReferral.receivedAt) {
    patch.firstReferral = referral;
  }
  if (!customer.latestReferral || referral.receivedAt > customer.latestReferral.receivedAt) {
    patch.latestReferral = referral;
  }
  if (referral.referral.sourceType === "ad" &&
    (!customer.latestAdReferral || referral.receivedAt > customer.latestAdReferral.receivedAt)) {
    patch.latestAdReferral = referral;
  }
  if (Object.keys(patch).length > 0) await ctx.db.patch(customer._id, patch);
}
