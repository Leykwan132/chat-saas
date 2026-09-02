"use node";

import { WorkOS } from "@workos-inc/node";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { getPartnerAuthJwks, issuePartnerAuthToken } from "./partnerAuthToken";

function getWorkosClient() {
  const apiKey = process.env.WORKOS_API_KEY;
  const clientId = process.env.WORKOS_CLIENT_ID;
  if (apiKey === undefined || clientId === undefined) {
    throw new Error("WorkOS authentication is not configured.");
  }
  return new WorkOS({ apiKey, clientId });
}

export const getJwks = internalAction({
  args: {},
  handler: async () => getPartnerAuthJwks(),
});

export const signIn = internalAction({
  args: { hostname: v.string(), email: v.string(), password: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    if (email.length === 0 || args.password.length === 0) {
      throw new Error("Unable to sign in with those credentials.");
    }

    try {
      const authentication = await getWorkosClient().userManagement.authenticateWithPassword({
        email,
        password: args.password,
      });
      const surface = await ctx.runQuery(internal.whiteLabel.partnerAuth.resolveSurface, {
        workosUserId: authentication.user.id,
        hostname: args.hostname,
      });
      if (surface === null) throw new Error("Unable to sign in with those credentials.");
      return {
        token: issuePartnerAuthToken({
          userId: authentication.user.id,
          email: authentication.user.email,
          firstName: authentication.user.firstName,
          lastName: authentication.user.lastName,
          profilePictureUrl: authentication.user.profilePictureUrl,
          hostname: surface.hostname,
          partnerId: surface.partnerId,
          partnerOrganizationId: surface.partnerOrganizationId,
        }),
        user: {
          id: authentication.user.id,
          email: authentication.user.email,
          firstName: authentication.user.firstName,
          lastName: authentication.user.lastName,
          profilePictureUrl: authentication.user.profilePictureUrl,
        },
      };
    } catch {
      throw new Error("Unable to sign in with those credentials.");
    }
  },
});
