import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

const defaultTeamTimeZone = "Asia/Kuala_Lumpur";

function normalizeTimeZone(timeZone: string | undefined) {
  return timeZone?.trim() || defaultTeamTimeZone;
}

async function ensureOwnerMembership(
  ctx: MutationCtx,
  teamId: Id<"teams">,
  userId: Id<"users">,
) {
  const membership = await ctx.db
    .query("teamMemberships")
    .withIndex("by_userId_and_teamId", (q) =>
      q.eq("userId", userId).eq("teamId", teamId),
    )
    .unique();
  if (membership === null) {
    await ctx.db.insert("teamMemberships", {
      teamId,
      userId,
      role: "owner",
      createdAt: Date.now(),
    });
  } else if (membership.role !== "owner") {
    await ctx.db.patch(membership._id, { role: "owner" });
  }
}

export async function ensureOrganizationalTeam(
  ctx: MutationCtx,
  args: {
    workosOrgId: string;
    name: string;
    stripeSubscriptionId?: string;
    ownerUserId: Id<"users">;
    timeZone?: string;
  },
) {
  const now = Date.now();
  let team = await ctx.db
    .query("teams")
    .withIndex("by_workosOrgId", (q) => q.eq("workosOrgId", args.workosOrgId))
    .unique();
  if (team === null) {
    const teamId = await ctx.db.insert("teams", {
      type: "organizational",
      name: args.name,
      stripeSubscriptionId: args.stripeSubscriptionId,
      ownerId: args.ownerUserId,
      workosOrgId: args.workosOrgId,
      timeZone: normalizeTimeZone(args.timeZone),
      createdAt: now,
      updatedAt: now,
    });
    team = (await ctx.db.get(teamId))!;
  } else if (
    team.name !== args.name ||
    (team.timeZone === undefined && args.timeZone !== undefined)
  ) {
    await ctx.db.patch(team._id, {
      name: args.name,
      timeZone: team.timeZone ?? normalizeTimeZone(args.timeZone),
      updatedAt: now,
    });
  }

  await ensureOwnerMembership(ctx, team._id, args.ownerUserId);
  return team._id;
}
