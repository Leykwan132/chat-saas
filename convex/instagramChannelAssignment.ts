import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { assertManageableAgent } from "./agentAccess";
import { resolveChannelOrgId } from "./authUtils";

export const getConnectContext = internalQuery({
  args: { agentId: v.id("agents") },
  returns: v.object({ orgId: v.string(), userId: v.string() }),
  handler: async (ctx, args) => {
    const { auth } = await assertManageableAgent(ctx, args.agentId);
    return {
      orgId: resolveChannelOrgId(auth.orgId, auth.userId),
      userId: auth.userId,
    };
  },
});

export const startPending = internalMutation({
  args: { agentId: v.id("agents"), igUserId: v.string() },
  returns: v.id("channels"),
  handler: async (ctx, args): Promise<Id<"channels">> => {
    const { auth } = await assertManageableAgent(ctx, args.agentId);
    const channelId: Id<"channels"> = await ctx.runMutation(
      internal.channels.internalStartInstagramPending,
      {
        orgId: resolveChannelOrgId(auth.orgId, auth.userId),
        connectedByUserId: auth.userId,
        igUserId: args.igUserId,
      },
    );
    await ctx.db.patch(channelId, { defaultAgentId: args.agentId });
    return channelId;
  },
});

export const recordPendingError = internalMutation({
  args: {
    channelId: v.id("channels"),
    agentId: v.id("agents"),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { auth } = await assertManageableAgent(ctx, args.agentId);
    const channel = await ctx.db.get(args.channelId);
    if (
      channel?.service !== "instagram" ||
      channel.status !== "pending" ||
      channel.defaultAgentId !== args.agentId ||
      channel.connectedByUserId !== auth.userId ||
      channel.orgId !== resolveChannelOrgId(auth.orgId, auth.userId)
    ) return null;
    await ctx.db.patch(channel._id, {
      status: "error",
      lastError: args.error,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const completePending = internalMutation({
  args: {
    channelId: v.id("channels"),
    agentId: v.id("agents"),
    instagramPageId: v.string(),
    displayUsername: v.optional(v.string()),
    accessToken: v.string(),
  },
  returns: v.id("channels"),
  handler: async (ctx, args): Promise<Id<"channels">> => {
    const { auth } = await assertManageableAgent(ctx, args.agentId);
    const channel = await ctx.db.get(args.channelId);
    const orgId = resolveChannelOrgId(auth.orgId, auth.userId);
    if (
      channel?.service !== "instagram" ||
      !channel.igUserId ||
      channel.status !== "pending" ||
      channel.defaultAgentId !== args.agentId ||
      channel.connectedByUserId !== auth.userId ||
      channel.orgId !== orgId
    ) {
      throw new Error("Instagram connection changed. Start the connection again.");
    }
    return await ctx.runMutation(internal.channels.internalUpsertInstagram, {
      orgId,
      igUserId: channel.igUserId,
      instagramPageId: args.instagramPageId,
      displayUsername: args.displayUsername,
      accessToken: args.accessToken,
      connectedByUserId: auth.userId,
    });
  },
});
