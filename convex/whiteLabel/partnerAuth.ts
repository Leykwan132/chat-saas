import { v } from "convex/values";
import { action, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import {
  resolvePartnerOrganizationChoices,
  resolvePartnerSurfaceForWorkosUser,
} from "./partnerAuthGateway";
import type { PartnerSignInResult } from "./partnerAuthTypes";

const partnerSurfaceValidator = v.object({
  kind: v.literal("partner"),
  hostname: v.string(),
  partnerId: v.id("whiteLabelPartners"),
  partnerOrganizationId: v.id("whiteLabelPartnerOrganizations"),
});

const partnerSignInValidator = v.union(
  v.object({
    kind: v.literal("session"),
    token: v.string(),
    user: v.object({
      id: v.string(),
      email: v.string(),
      firstName: v.union(v.string(), v.null()),
      lastName: v.union(v.string(), v.null()),
      profilePictureUrl: v.union(v.string(), v.null()),
    }),
  }),
  v.object({
    kind: v.literal("organization_choice"),
    organizations: v.array(v.object({
      id: v.id("whiteLabelPartnerOrganizations"),
      name: v.string(),
    })),
  }),
);

export const resolveSurface = internalQuery({
  args: {
    workosUserId: v.string(),
    hostname: v.string(),
    partnerOrganizationId: v.optional(v.id("whiteLabelPartnerOrganizations")),
  },
  returns: v.union(v.null(), partnerSurfaceValidator),
  handler: async (ctx, args) => await resolvePartnerSurfaceForWorkosUser(
    ctx,
    args.workosUserId,
    args.hostname,
    args.partnerOrganizationId,
  ),
});

export const resolveOrganizationChoices = internalQuery({
  args: { workosUserId: v.string(), hostname: v.string() },
  returns: v.array(v.object({
    id: v.id("whiteLabelPartnerOrganizations"),
    name: v.string(),
  })),
  handler: async (ctx, args) => await resolvePartnerOrganizationChoices(
    ctx,
    args.workosUserId,
    args.hostname,
  ),
});

export const signIn = action({
  args: {
    hostname: v.string(),
    email: v.string(),
    password: v.string(),
    partnerOrganizationId: v.optional(v.id("whiteLabelPartnerOrganizations")),
  },
  returns: partnerSignInValidator,
  handler: async (ctx, args): Promise<PartnerSignInResult> => await ctx.runAction(
    internal.whiteLabel.partnerAuthNode.signIn,
    args,
  ),
});
