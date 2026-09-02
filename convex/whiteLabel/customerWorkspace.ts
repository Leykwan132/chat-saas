import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { getPartnerOrganizationForManagedTeam } from "./managedTeams";

type DatabaseCtx = QueryCtx | MutationCtx;

export async function getAssignedPartnerCustomerWorkspace(
  ctx: DatabaseCtx,
  workosUserId: string,
) {
  const account = await ctx.db
    .query("whiteLabelPartnerOrganizationAccounts")
    .withIndex("by_workosUserId", (q) => q.eq("workosUserId", workosUserId))
    .first();
  if (account === null) return null;

  const organization = await ctx.db.get(account.partnerOrganizationId);
  if (organization === null || organization.status !== "active") return null;

  const team = await ctx.db.get(organization.teamId);
  if (team === null || team.type !== "organizational") return null;

  return { account, team };
}

export async function getPartnerCustomerActiveTeam(
  ctx: DatabaseCtx,
  user: Doc<"users">,
  partnerOrganizationId?: Id<"whiteLabelPartnerOrganizations">,
) {
  const workspace = await getAssignedPartnerCustomerWorkspace(
    ctx,
    user.workosUserId,
  );
  if (workspace === null) return null;
  if (
    partnerOrganizationId !== undefined &&
    workspace.account.partnerOrganizationId !== partnerOrganizationId
  ) {
    return null;
  }

  if (user.activeTeamId !== undefined) {
    const activeTeam = await ctx.db.get(user.activeTeamId);
    if (activeTeam !== null) {
      const owner = await getPartnerOrganizationForManagedTeam(ctx, activeTeam._id);
      const membership = await ctx.db
        .query("teamMemberships")
        .withIndex("by_userId_and_teamId", (q) =>
          q.eq("userId", user._id).eq("teamId", activeTeam._id),
        )
        .unique();
      if (owner?._id === workspace.account.partnerOrganizationId && membership !== null) {
        return activeTeam;
      }
    }
  }

  const membership = await ctx.db
    .query("teamMemberships")
    .withIndex("by_userId_and_teamId", (q) =>
      q.eq("userId", user._id).eq("teamId", workspace.team._id),
    )
    .unique();
  if (membership === null) {
    throw new Error("Assigned partner workspace is unavailable");
  }
  return workspace.team;
}

export async function assertPartnerCustomerTeam(
  ctx: MutationCtx,
  workosUserId: string,
  teamId: Id<"teams">,
) {
  const workspace = await getAssignedPartnerCustomerWorkspace(ctx, workosUserId);
  if (workspace !== null && teamId !== workspace.team._id) {
    throw new Error("Partner customers can only access their assigned workspace");
  }
}

async function getUserId(
  ctx: MutationCtx,
  workosUserId: string,
): Promise<Id<"users"> | null> {
  const user = await ctx.db
    .query("users")
    .withIndex("by_workosUserId", (q) => q.eq("workosUserId", workosUserId))
    .unique();
  return user?._id ?? null;
}

async function ensureAssignedMembership(
  ctx: MutationCtx,
  args: {
    teamId: Id<"teams">;
    userId: Id<"users">;
    role: "owner" | "admin" | "member";
  },
) {
  const membership = await ctx.db
    .query("teamMemberships")
    .withIndex("by_userId_and_teamId", (q) =>
      q.eq("userId", args.userId).eq("teamId", args.teamId),
    )
    .unique();
  if (membership === null) {
    await ctx.db.insert("teamMemberships", {
      ...args,
      createdAt: Date.now(),
    });
    return;
  }
  if (membership.role !== args.role) {
    await ctx.db.patch(membership._id, { role: args.role });
  }
}

export async function reconcilePartnerCustomerWorkspace(
  ctx: MutationCtx,
  workosUserId: string,
) {
  const workspace = await getAssignedPartnerCustomerWorkspace(ctx, workosUserId);
  if (workspace === null) return false;

  const userId = await getUserId(ctx, workosUserId);
  if (userId === null) return false;

  await ensureAssignedMembership(ctx, {
    teamId: workspace.team._id,
    userId,
    role: workspace.account.role,
  });
  return true;
}
