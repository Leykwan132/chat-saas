import { v } from "convex/values";
import { internal } from "../_generated/api";
import {
  internalMutation,
  internalQuery,
} from "../_generated/server";
import { canProcessWorkspaceActivity } from "./access";
import { teamDeletionPool } from "./pool";
import { externalResourceProviderValidator } from "./schema";

export const register = internalMutation({
  args: {
    orgId: v.string(),
    provider: externalResourceProviderValidator,
    resourceId: v.string(),
    authorization: v.optional(v.string()),
    cleanupRequired: v.boolean(),
  },
  returns: v.object({
    resourceId: v.id("teamExternalResources"),
    workspaceAvailable: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("teamExternalResources")
      .withIndex("by_orgId_provider_resourceId", (q) =>
        q
          .eq("orgId", args.orgId)
          .eq("provider", args.provider)
          .eq("resourceId", args.resourceId),
      )
      .unique();
    const resourceId = existing?._id ??
      await ctx.db.insert("teamExternalResources", {
        orgId: args.orgId,
        provider: args.provider,
        resourceId: args.resourceId,
        authorization: args.authorization,
        createdAt: Date.now(),
      });
    const workspaceAvailable = await canProcessWorkspaceActivity(
      ctx,
      args.orgId,
    );
    if (!workspaceAvailable || args.cleanupRequired) {
      await teamDeletionPool.enqueueAction(
        ctx,
        internal.teamDeletion.externalResourceCleanup.run,
        { resourceId },
        { retry: true },
      );
    }
    return {
      resourceId,
      workspaceAvailable: workspaceAvailable && !args.cleanupRequired,
    };
  },
});

export const get = internalQuery({
  args: {
    resourceId: v.id("teamExternalResources"),
  },
  returns: v.any(),
  handler: async (ctx, args) => await ctx.db.get(args.resourceId),
});

export const getOrgPage = internalQuery({
  args: {
    orgId: v.string(),
    limit: v.number(),
  },
  returns: v.any(),
  handler: async (ctx, args) =>
    await ctx.db
      .query("teamExternalResources")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .take(args.limit),
});

export const remove = internalMutation({
  args: {
    resourceId: v.id("teamExternalResources"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (await ctx.db.get(args.resourceId)) {
      await ctx.db.delete(args.resourceId);
    }
    return null;
  },
});
