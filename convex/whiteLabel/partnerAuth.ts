import { v } from "convex/values";
import { action, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import { resolvePartnerSurfaceForWorkosUser } from "./partnerAuthGateway";
import type { PartnerSignInResult } from "./partnerAuthTypes";

const partnerSurfaceValidator = v.object({
  kind: v.literal("partner"),
  hostname: v.string(),
  partnerId: v.id("whiteLabelPartners"),
  partnerOrganizationId: v.id("whiteLabelPartnerOrganizations"),
});

const partnerSignInValidator = v.object({
  token: v.string(),
  user: v.object({
    id: v.string(),
    email: v.string(),
    firstName: v.union(v.string(), v.null()),
    lastName: v.union(v.string(), v.null()),
    profilePictureUrl: v.union(v.string(), v.null()),
  }),
});

export const resolveSurface = internalQuery({
  args: { workosUserId: v.string(), hostname: v.string() },
  returns: v.union(v.null(), partnerSurfaceValidator),
  handler: async (ctx, args) => await resolvePartnerSurfaceForWorkosUser(
    ctx,
    args.workosUserId,
    args.hostname,
  ),
});

export const signIn = action({
  args: { hostname: v.string(), email: v.string(), password: v.string() },
  returns: partnerSignInValidator,
  handler: async (ctx, args): Promise<PartnerSignInResult> => await ctx.runAction(
    internal.whiteLabel.partnerAuthNode.signIn,
    args,
  ),
});
