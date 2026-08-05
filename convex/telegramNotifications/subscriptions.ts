import { v } from "convex/values";
import { mutation, query, type MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { assertManageableAgent } from "../agentAccess";
import { buildTelegramVerificationUrl, requireNotificationBotUsername } from "./config";
import { normalizeTelegramPhone } from "./phone";
import { subscriptionState } from "./subscriptionAccess";
import { createVerificationToken } from "./token";

const subscriptionIdValidator = v.id("agentTelegramNotificationSubscriptions");

const subscriptionStateValidator = v.union(
  v.literal("pending"),
  v.literal("connected"),
  v.literal("disabled"),
  v.literal("blocked"),
);

async function createVerificationLink() {
  const token = await createVerificationToken();
  return {
    verificationTokenHash: token.tokenHash,
    verificationUrl: buildTelegramVerificationUrl(
      requireNotificationBotUsername(process.env),
      token.rawToken,
    ),
  };
}

export const listForAgent = query({
  args: { agentId: v.id("agents") },
  returns: v.array(
    v.object({
      subscriptionId: subscriptionIdValidator,
      phoneNumber: v.string(),
      state: subscriptionStateValidator,
      enabled: v.boolean(),
      canSendTest: v.boolean(),
      lastTestSentAt: v.optional(v.number()),
    }),
  ),
  handler: async (ctx, args) => {
    await assertManageableAgent(ctx, args.agentId);
    const subscriptions = await ctx.db
      .query("agentTelegramNotificationSubscriptions")
      .withIndex("by_agentId", (q) => q.eq("agentId", args.agentId))
      .take(5);

    return await Promise.all(
      subscriptions.map(async (subscription) => {
        const recipient = await ctx.db.get(subscription.recipientId);
        if (!recipient) {
          throw new Error("Telegram recipient is unavailable");
        }
        const state = subscriptionState(subscription.status, recipient.status);
        return {
          subscriptionId: subscription._id,
          phoneNumber: `+${recipient.phoneDigits}`,
          state,
          enabled: subscription.status === "enabled",
          canSendTest: state === "connected",
          lastTestSentAt: subscription.lastTestSentAt,
        };
      }),
    );
  },
});

export const add = mutation({
  args: { agentId: v.id("agents"), phone: v.string() },
  returns: v.union(
    v.object({
      subscriptionId: subscriptionIdValidator,
      state: v.literal("connected"),
    }),
    v.object({
      subscriptionId: subscriptionIdValidator,
      state: v.literal("pending"),
      verificationUrl: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    await assertManageableAgent(ctx, args.agentId);
    const phoneDigits = normalizeTelegramPhone(args.phone);
    let recipient = await ctx.db
      .query("telegramNotificationRecipients")
      .withIndex("by_phoneDigits", (q) => q.eq("phoneDigits", phoneDigits))
      .unique();

    if (recipient) {
      const existingSubscription = await ctx.db
        .query("agentTelegramNotificationSubscriptions")
        .withIndex("by_agentId_and_recipientId", (q) =>
          q.eq("agentId", args.agentId).eq("recipientId", recipient!._id),
        )
        .unique();
      if (existingSubscription) {
        throw new Error("This Telegram recipient is already added to the agent");
      }
    }

    const savedSubscriptions = await ctx.db
      .query("agentTelegramNotificationSubscriptions")
      .withIndex("by_agentId", (q) => q.eq("agentId", args.agentId))
      .take(6);
    if (savedSubscriptions.length >= 5) {
      throw new Error("An agent can have at most five Telegram recipients");
    }

    const now = Date.now();
    if (!recipient) {
      const verification = await createVerificationLink();
      const recipientId = await ctx.db.insert("telegramNotificationRecipients", {
        phoneDigits,
        status: "pending",
        verificationTokenHash: verification.verificationTokenHash,
        createdAt: now,
        updatedAt: now,
      });
      const subscriptionId = await ctx.db.insert("agentTelegramNotificationSubscriptions", {
        agentId: args.agentId,
        recipientId,
        status: "enabled",
        createdAt: now,
        updatedAt: now,
      });
      return {
        subscriptionId,
        state: "pending" as const,
        verificationUrl: verification.verificationUrl,
      };
    }

    const subscriptionId = await ctx.db.insert("agentTelegramNotificationSubscriptions", {
      agentId: args.agentId,
      recipientId: recipient._id,
      status: "enabled",
      createdAt: now,
      updatedAt: now,
    });
    if (recipient.status === "verified") {
      return { subscriptionId, state: "connected" as const };
    }

    const verification = await createVerificationLink();
    await ctx.db.patch(recipient._id, {
      status: "pending",
      verificationTokenHash: verification.verificationTokenHash,
      verificationChatId: undefined,
      telegramChatId: undefined,
      telegramUserId: undefined,
      firstName: undefined,
      lastName: undefined,
      verifiedAt: undefined,
      updatedAt: now,
    });
    return {
      subscriptionId,
      state: "pending" as const,
      verificationUrl: verification.verificationUrl,
    };
  },
});

async function getManagedSubscription(
  ctx: MutationCtx,
  subscriptionId: Id<"agentTelegramNotificationSubscriptions">,
) {
  const subscription = await ctx.db.get(subscriptionId);
  if (!subscription) throw new Error("Telegram subscription not found");
  await assertManageableAgent(ctx, subscription.agentId);
  const recipient = await ctx.db.get(subscription.recipientId);
  if (!recipient) throw new Error("Telegram recipient is unavailable");
  return { subscription, recipient };
}

export const regenerateVerificationLink = mutation({
  args: { subscriptionId: subscriptionIdValidator },
  returns: v.object({ verificationUrl: v.string() }),
  handler: async (ctx, args) => {
    const { recipient } = await getManagedSubscription(ctx, args.subscriptionId);
    if (recipient.status === "verified") {
      throw new Error("This Telegram recipient is already connected");
    }
    const verification = await createVerificationLink();
    await ctx.db.patch(recipient._id, {
      status: "pending",
      verificationTokenHash: verification.verificationTokenHash,
      verificationChatId: undefined,
      telegramChatId: undefined,
      telegramUserId: undefined,
      firstName: undefined,
      lastName: undefined,
      verifiedAt: undefined,
      updatedAt: Date.now(),
    });
    return { verificationUrl: verification.verificationUrl };
  },
});

export const setEnabled = mutation({
  args: { subscriptionId: subscriptionIdValidator, enabled: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { subscription } = await getManagedSubscription(ctx, args.subscriptionId);
    await ctx.db.patch(subscription._id, {
      status: args.enabled ? "enabled" : "disabled",
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const remove = mutation({
  args: { subscriptionId: subscriptionIdValidator },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { subscription } = await getManagedSubscription(ctx, args.subscriptionId);
    await ctx.db.delete(subscription._id);
    return null;
  },
});
