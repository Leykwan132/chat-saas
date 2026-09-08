import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type DatabaseCtx = QueryCtx | MutationCtx;

export async function getPartnerCustomerWorkspace(
  ctx: DatabaseCtx,
  workosUserId: string,
  partnerOrganizationId: Id<"whiteLabelPartnerOrganizations">,
) {
  const account = await ctx.db
    .query("whiteLabelPartnerOrganizationAccounts")
    .withIndex("by_partnerOrganizationId_and_workosUserId", (q) =>
      q
        .eq("partnerOrganizationId", partnerOrganizationId)
        .eq("workosUserId", workosUserId),
    )
    .unique();
  if (account === null || account.status !== "active") return null;
  const organization = await ctx.db.get(partnerOrganizationId);
  if (organization === null || organization.status !== "active") return null;
  const team = await ctx.db.get(organization.teamId);
  if (team === null || team.type !== "organizational") return null;
  return { account, organization, team };
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
  partnerOrganizationId: Id<"whiteLabelPartnerOrganizations">,
) {
  const workspace = await getPartnerCustomerWorkspace(
    ctx,
    workosUserId,
    partnerOrganizationId,
  );
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
    updatedAt: Date.now(),
  });
  return true;
}
