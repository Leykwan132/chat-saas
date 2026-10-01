import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { notificationBotIdForRecipient } from "./config";
import { normalizeTelegramPhone } from "./phone";
import { notificationBotIdValidator } from "./validators";

export const bindVerificationChat = internalMutation({
  args: { tokenHash: v.string(), chatId: v.string(), notificationBot: notificationBotIdValidator },
  returns: v.object({ accepted: v.boolean(), notificationBot: v.optional(notificationBotIdValidator) }),
  handler: async (ctx, args) => {
    const recipient = await ctx.db
      .query("telegramNotificationRecipients")
      .withIndex("by_verificationTokenHash", (q) =>
        q.eq("verificationTokenHash", args.tokenHash),
      )
      .unique();
    if (
      !recipient ||
      recipient.status !== "pending" ||
      recipient.verificationTokenHash !== args.tokenHash ||
      notificationBotIdForRecipient(recipient.notificationBot) !== args.notificationBot
    ) {
      return { accepted: false };
    }
    const previouslyBound = await ctx.db
      .query("telegramNotificationRecipients")
      .withIndex("by_verificationChatId_and_updatedAt", (q) =>
        q.eq("verificationChatId", args.chatId),
      )
      .order("desc")
      .take(10);
    const now = Date.now();
    for (const other of previouslyBound) {
      if (other._id !== recipient._id) {
        await ctx.db.patch(other._id, { verificationChatId: undefined, updatedAt: now });
      }
    }
    await ctx.db.patch(recipient._id, { verificationChatId: args.chatId, updatedAt: now });
    return { accepted: true, notificationBot: notificationBotIdForRecipient(recipient.notificationBot) };
  },
});

export const verifySharedContact = internalMutation({
  args: {
    chatId: v.string(),
    senderId: v.string(),
    contactUserId: v.optional(v.string()),
    phoneNumber: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    notificationBot: notificationBotIdValidator,
  },
  returns: v.object({ verified: v.boolean(), notificationBot: v.optional(notificationBotIdValidator) }),
  handler: async (ctx, args) => {
    if (args.contactUserId !== args.senderId) return { verified: false };
    let phoneDigits: string;
    try {
      phoneDigits = normalizeTelegramPhone(args.phoneNumber);
    } catch {
      return { verified: false };
    }
    const candidates = await ctx.db
      .query("telegramNotificationRecipients")
      .withIndex("by_verificationChatId_and_updatedAt", (q) =>
        q.eq("verificationChatId", args.chatId),
      )
      .order("desc")
      .take(1);
    const recipient = candidates.find((candidate) =>
      candidate.status === "pending" &&
      candidate.phoneDigits === phoneDigits &&
      notificationBotIdForRecipient(candidate.notificationBot) === args.notificationBot,
    );
    if (!recipient) {
      return { verified: false };
    }
    const now = Date.now();
    await ctx.db.patch(recipient._id, {
      status: "verified",
      telegramChatId: args.chatId,
      telegramUserId: args.senderId,
      firstName: args.firstName,
      lastName: args.lastName,
      verifiedAt: now,
      verificationTokenHash: undefined,
      verificationChatId: undefined,
      updatedAt: now,
    });
    return { verified: true, notificationBot: notificationBotIdForRecipient(recipient.notificationBot) };
  },
});
