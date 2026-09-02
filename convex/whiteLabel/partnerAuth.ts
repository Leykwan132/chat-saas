import { v } from "convex/values";
import { action, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import { resolvePartnerSurfaceForWorkosUser } from "./partnerAuthGateway";

export const resolveSurface = internalQuery({
  args: { workosUserId: v.string(), hostname: v.string() },
  handler: async (ctx, args) => await resolvePartnerSurfaceForWorkosUser(
    ctx,
    args.workosUserId,
    args.hostname,
  ),
});

export const signIn = action({
  args: { hostname: v.string(), email: v.string(), password: v.string() },
  handler: async (ctx, args) => await ctx.runAction(
    internal.whiteLabel.partnerAuthNode.signIn,
    args,
  ),
});
