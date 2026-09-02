import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

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
) {
  const workspace = await getAssignedPartnerCustomerWorkspace(
    ctx,
    user.workosUserId,
  );
  if (workspace === null) return null;

  const membership = await ctx.db
    .query("teamMemberships")
    .withIndex("by_userId_and_teamId", (q) =>
      q.eq("userId", user._id).eq("teamId", workspace.team._id),
    )
    .unique();
  if (membership === null) {
    throw new Error("Assigned partner workspace is unavailable");
  }
  if (
    user.activeTeamId !== workspace.team._id &&
    typeof (ctx.db as MutationCtx["db"]).patch === "function"
  ) {
    await (ctx.db as MutationCtx["db"]).patch(user._id, {
      activeTeamId: workspace.team._id,
      updatedAt: Date.now(),
    });
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

export async function markPartnerCustomerOnboarded(
  ctx: MutationCtx,
  args: { userId: Id<"users">; workosUserId: string },
) {
  const workspace = await getAssignedPartnerCustomerWorkspace(
    ctx,
    args.workosUserId,
  );
  if (workspace === null) return false;
  await ctx.db.patch(args.userId, { onboarded: true, updatedAt: Date.now() });
  return true;
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

async function removePersonalWorkspace(
  ctx: MutationCtx,
  userId: Id<"users">,
) {
  const personalTeam = await ctx.db
    .query("teams")
    .withIndex("by_ownerId_and_type", (q) =>
      q.eq("ownerId", userId).eq("type", "personal"),
    )
    .first();
  if (personalTeam === null) return;

  const membership = await ctx.db
    .query("teamMemberships")
    .withIndex("by_userId_and_teamId", (q) =>
      q.eq("userId", userId).eq("teamId", personalTeam._id),
    )
    .unique();
  if (membership !== null) {
    await ctx.db.delete(membership._id);
  }

  const remainingMembership = await ctx.db
    .query("teamMemberships")
    .withIndex("by_teamId", (q) => q.eq("teamId", personalTeam._id))
    .take(1);
  if (remainingMembership.length === 0) {
    await ctx.db.delete(personalTeam._id);
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
  await ctx.db.patch(userId, {
    onboarded: true,
    activeTeamId: workspace.team._id,
    updatedAt: Date.now(),
  });
  await removePersonalWorkspace(ctx, userId);
  return true;
}
