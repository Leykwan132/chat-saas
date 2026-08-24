import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

const PAGE_SIZE = 50;

async function deleteRows(
  ctx: MutationCtx,
  rows: ReadonlyArray<{ _id: Id<"whiteLabelPartnerOrganizationAccounts"> }>,
) {
  for (const row of rows) {
    await ctx.db.delete(row._id);
  }
  return rows.length > 0;
}

async function deleteCredentials(
  ctx: MutationCtx,
  organizationId: Id<"whiteLabelPartnerOrganizations">,
) {
  const rows = await ctx.db
    .query("whiteLabelPartnerCustomerCredentials")
    .withIndex("by_partnerOrganizationId_and_workosUserId", (q) =>
      q.eq("partnerOrganizationId", organizationId),
    )
    .take(PAGE_SIZE);
  for (const row of rows) await ctx.db.delete(row._id);
  return rows.length > 0;
}

export async function deleteWhiteLabelPartnerOrganizationPage(
  ctx: MutationCtx,
  args: { teamId: Id<"teams">; workosOrgId: string },
) {
  const organization = await ctx.db
    .query("whiteLabelPartnerOrganizations")
    .withIndex("by_teamId", (q) => q.eq("teamId", args.teamId))
    .unique();
  if (organization === null) return false;
  if (await deleteCredentials(ctx, organization._id)) return true;
  const accounts = await ctx.db
    .query("whiteLabelPartnerOrganizationAccounts")
    .withIndex("by_partnerOrganizationId", (q) =>
      q.eq("partnerOrganizationId", organization._id),
    )
    .take(PAGE_SIZE);
  if (await deleteRows(ctx, accounts)) return true;
  const invitations = await ctx.db
    .query("teamInvitationRecords")
    .withIndex("by_workosOrgId", (q) => q.eq("workosOrgId", args.workosOrgId))
    .take(PAGE_SIZE);
  if (invitations.length > 0) {
    for (const invitation of invitations) {
      await ctx.db.delete(invitation._id);
    }
    return true;
  }
  const plans = await ctx.db
    .query("whiteLabelPartnerOrganizationPlans")
    .withIndex("by_partnerOrganizationId", (q) =>
      q.eq("partnerOrganizationId", organization._id),
    )
    .take(PAGE_SIZE);
  if (plans.length > 0) {
    for (const plan of plans) await ctx.db.delete(plan._id);
    return true;
  }
  const assignments = await ctx.db
    .query("whiteLabelPartnerOrganizationPlanAssignments")
    .withIndex("by_partnerOrganizationId_and_createdAt", (q) =>
      q.eq("partnerOrganizationId", organization._id),
    )
    .take(PAGE_SIZE);
  if (assignments.length > 0) {
    for (const assignment of assignments) await ctx.db.delete(assignment._id);
    return true;
  }
  const periods = await ctx.db
    .query("whiteLabelPartnerOrganizationCreditPeriods")
    .withIndex("by_partnerOrganizationId_and_periodStart", (q) =>
      q.eq("partnerOrganizationId", organization._id),
    )
    .take(PAGE_SIZE);
  if (periods.length > 0) {
    for (const period of periods) await ctx.db.delete(period._id);
    return true;
  }
  const grants = await ctx.db
    .query("whiteLabelPartnerOrganizationCreditGrants")
    .withIndex("by_partnerOrganizationId_and_createdAt", (q) =>
      q.eq("partnerOrganizationId", organization._id),
    )
    .take(PAGE_SIZE);
  if (grants.length > 0) {
    for (const grant of grants) await ctx.db.delete(grant._id);
    return true;
  }
  const balances = await ctx.db
    .query("whiteLabelPartnerOrganizationCreditBalances")
    .withIndex("by_partnerOrganizationId", (q) =>
      q.eq("partnerOrganizationId", organization._id),
    )
    .take(PAGE_SIZE);
  if (balances.length > 0) {
    for (const balance of balances) await ctx.db.delete(balance._id);
    return true;
  }
  const ledger = await ctx.db
    .query("whiteLabelPartnerOrganizationCreditLedger")
    .withIndex("by_partnerOrganizationId_and_createdAt", (q) =>
      q.eq("partnerOrganizationId", organization._id),
    )
    .take(PAGE_SIZE);
  if (ledger.length > 0) {
    for (const entry of ledger) await ctx.db.delete(entry._id);
    return true;
  }
  await ctx.db.delete(organization._id);
  return true;
}
