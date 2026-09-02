import { v } from "convex/values";
import { internalQuery, query } from "../_generated/server";
import { getAuthContext } from "../authUtils";
import { isWhiteLabelTeam } from "./planResolver";

export const isBillingBlockedForTeam = internalQuery({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => await isWhiteLabelTeam(ctx, args.teamId),
});

export const isBillingBlockedForCurrentWorkspace = query({
  args: {},
  handler: async (ctx) => {
    const auth = await getAuthContext(ctx);
    return await isWhiteLabelTeam(ctx, auth.activeTeamId);
  },
});

export const isPartnerManagedCurrentWorkspace = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const auth = await getAuthContext(ctx);
    return await isWhiteLabelTeam(ctx, auth.activeTeamId);
  },
});
