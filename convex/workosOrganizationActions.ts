"use node";

import { v } from "convex/values";
import { WorkOS } from "@workos-inc/node";
import { action, type ActionCtx } from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { getAuthContext } from "./authUtils";
import { getWorkOSApiKey } from "./workosClient";

async function assertCanManageOrganization(ctx: ActionCtx, teamId: Id<"teams">) {
  const team = await ctx.runQuery(api.teams.getTeamDetail, { teamId });
  if (team === null) {
    throw new Error("Team not found.");
  }
  if (team.type !== "organizational" || !team.workosOrgId) {
    throw new Error("Only shared teams can be managed here.");
  }
  if (!team.isOwner) {
    throw new Error("Only team owners can manage this organization.");
  }
  return team;
}

export const deleteOrganizationForTeam = action({
  args: {
    teamId: v.id("teams"),
  },
  handler: async (ctx, args) => {
    const team = await assertCanManageOrganization(ctx, args.teamId);
    const { userId } = await getAuthContext(ctx);

    const workos = new WorkOS(getWorkOSApiKey());
    await workos.organizations.deleteOrganization(team.workosOrgId!);

    await ctx.runMutation(internal.organizationsAdmin.removeOrganizationLocally, {
      workosOrgId: team.workosOrgId!,
      workosUserId: userId,
    });

    return { success: true as const };
  },
});
