import { v } from "convex/values";
import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getAuthContext, resolveChannelOrgId } from "./authUtils";
import {
  isOpenWhatsAppConnectionAttempt,
  maybeCompleteWhatsAppConnectionAttempt,
  WHATSAPP_OPEN_CONNECTION_ATTEMPT_STATUSES,
} from "./whatsappConnectionAttemptUtils";
import { completeWhatsAppSignup } from "./whatsappSignupCompletion";

/** Canonical redirect for WhatsApp embedded signup + code exchange. */
export function whatsappOAuthRedirectUri(): string {
  const siteUrl = process.env.CONVEX_SITE_URL;
  if (!siteUrl) {
    throw new Error("CONVEX_SITE_URL is not set");
  }
  return `${siteUrl.replace(/\/+$/, "")}/auth/whatsapp/callback`;
}

export const beginConnectionAttempt = mutation({
  args: {
    agentId: v.optional(v.id("agents")),
  },
  handler: async (ctx, args): Promise<Id<"whatsappConnectionAttempts">> => {
    const { orgId, userId } = await getAuthContext(ctx);
    const channelOrgId = resolveChannelOrgId(orgId, userId);
    const now = Date.now();
    if (args.agentId !== undefined) {
      const agent = await ctx.db.get(args.agentId);
      if (
        agent === null ||
        (agent.userId !== userId && agent.orgId !== channelOrgId)
      ) {
        throw new Error("Agent not found.");
      }
    }

    for (const status of WHATSAPP_OPEN_CONNECTION_ATTEMPT_STATUSES) {
      const existing = await ctx.db
        .query("whatsappConnectionAttempts")
        .withIndex("by_connectedByUserId_and_status", (q) =>
          q.eq("connectedByUserId", userId).eq("status", status),
        )
        .first();
      if (existing !== null) {
        throw new Error(
          "You already have a WhatsApp connection in progress. Cancel it before starting a new one.",
        );
      }
    }

    return await ctx.db.insert("whatsappConnectionAttempts", {
      orgId: channelOrgId,
      connectedByUserId: userId,
      ...(args.agentId !== undefined ? { agentId: args.agentId } : {}),
      status: "started",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const cancelConnectionAttempt = mutation({
  args: {
    attemptId: v.id("whatsappConnectionAttempts"),
  },
  handler: async (ctx, args) => {
    const { userId } = await getAuthContext(ctx);
    const attempt = await ctx.db.get(args.attemptId);
    if (attempt === null) {
      throw new Error("Connection attempt not found.");
    }
    if (attempt.connectedByUserId !== userId) {
      throw new Error("Not allowed to cancel this connection attempt.");
    }
    if (!isOpenWhatsAppConnectionAttempt(attempt) && attempt.status !== "error") {
      throw new Error("This connection attempt is no longer active.");
    }
    await ctx.db.patch(args.attemptId, {
      status: "cancelled",
      updatedAt: Date.now(),
    });
  },
});

export const getOpenConnectionAttempt = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await getAuthContext(ctx);
    const statuses = [
      ...WHATSAPP_OPEN_CONNECTION_ATTEMPT_STATUSES,
      "error" as const,
    ];
    for (const status of statuses) {
      const attempt = await ctx.db
        .query("whatsappConnectionAttempts")
        .withIndex("by_connectedByUserId_and_status", (q) =>
          q.eq("connectedByUserId", userId).eq("status", status),
        )
        .first();
      if (attempt !== null) {
        return attempt;
      }
    }
    return null;
  },
});

export const internalUpdateConnectionAttempt = internalMutation({
  args: {
    attemptId: v.id("whatsappConnectionAttempts"),
    wabaId: v.optional(v.string()),
    phoneNumberId: v.optional(v.string()),
    channelId: v.optional(v.id("channels")),
    status: v.optional(
      v.union(
        v.literal("started"),
        v.literal("signup_finished"),
        v.literal("token_ready"),
        v.literal("connected"),
        v.literal("syncing"),
        v.literal("completed"),
        v.literal("cancelled"),
        v.literal("error"),
      ),
    ),
    lastError: v.optional(v.string()),
    partnerAppInstalledAt: v.optional(v.number()),
    syncStartedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const attempt = await ctx.db.get(args.attemptId);
    if (attempt === null) return;
    await ctx.db.patch(args.attemptId, {
      ...(args.wabaId !== undefined ? { wabaId: args.wabaId } : {}),
      ...(args.phoneNumberId !== undefined
        ? { phoneNumberId: args.phoneNumberId }
        : {}),
      ...(args.channelId !== undefined ? { channelId: args.channelId } : {}),
      ...(args.status !== undefined ? { status: args.status } : {}),
      ...(args.lastError !== undefined ? { lastError: args.lastError } : {}),
      ...(args.partnerAppInstalledAt !== undefined
        ? { partnerAppInstalledAt: args.partnerAppInstalledAt }
        : {}),
      ...(args.syncStartedAt !== undefined
        ? { syncStartedAt: args.syncStartedAt }
        : {}),
      updatedAt: Date.now(),
    });
  },
});

export const internalMaybeCompleteConnectionAttempt = internalMutation({
  args: {
    channelId: v.id("channels"),
  },
  handler: async (ctx, args) => {
    await maybeCompleteWhatsAppConnectionAttempt(ctx, args.channelId);
  },
});

export const internalStartCoexistenceSyncForChannel = internalMutation({
  args: {
    channelId: v.id("channels"),
    attemptId: v.optional(v.id("whatsappConnectionAttempts")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    if (args.attemptId !== undefined) {
      const attempt = await ctx.db.get(args.attemptId);
      if (attempt !== null && isOpenWhatsAppConnectionAttempt(attempt)) {
        await ctx.db.patch(args.attemptId, {
          channelId: args.channelId,
          status: "syncing",
          syncStartedAt: attempt.syncStartedAt ?? now,
          updatedAt: now,
        });
      }
    }
  },
});

export const completeSignup = action({
  args: {
    code: v.string(),
    attemptId: v.id("whatsappConnectionAttempts"),
  },
  handler: completeWhatsAppSignup,
});

export const internalGetAttempt = internalQuery({
  args: {
    attemptId: v.id("whatsappConnectionAttempts"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.attemptId);
  },
});
