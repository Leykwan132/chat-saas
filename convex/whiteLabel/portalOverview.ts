import { v } from "convex/values";
import type { QueryCtx } from "../_generated/server";
import { PLAN_CATALOG, type PlanKey } from "../planCatalog";
import { orgRoleKeyFromWorkosSlug } from "../../shared/teamRoleCatalog";
import { assertCurrentPartnerAccess } from "./access";
import { getPartnerCreditBalance } from "./creditLedger";

const planKeyValidator = v.union(
  v.literal("free"),
  v.literal("starter"),
  v.literal("growth"),
  v.literal("business"),
);

const customerInvitationStateValidator = v.union(
  v.literal("pending"),
  v.literal("accepted"),
);

export const partnerOverviewValidator = v.object({
  activeOrganizations: v.number(),
  grantCount: v.number(),
  totalGrantedCredits: v.number(),
  totalSpentCredits: v.number(),
  planMix: v.object({
    free: v.number(),
    starter: v.number(),
    growth: v.number(),
    business: v.number(),
  }),
  organizations: v.array(
    v.object({
      partnerOrganizationId: v.id("whiteLabelPartnerOrganizations"),
      name: v.string(),
      status: v.literal("active"),
      planKey: planKeyValidator,
      monthlyAllowance: v.number(),
      renewalAt: v.number(),
      customerCount: v.number(),
      addedCredits: v.number(),
      spentCredits: v.number(),
      remainingCredits: v.number(),
      lastGrantAt: v.union(v.number(), v.null()),
      grantCount: v.number(),
    }),
  ),
  customers: v.array(
    v.object({
      email: v.string(),
      organizationName: v.string(),
      role: v.union(
        v.literal("owner"),
        v.literal("admin"),
        v.literal("member"),
      ),
      invitationStatus: customerInvitationStateValidator,
    }),
  ),
});

function isCustomerInvitation(
  state: "pending" | "accepted" | "expired" | "revoked",
): state is "pending" | "accepted" {
  return state === "pending" || state === "accepted";
}

export async function getPartnerOverview(ctx: QueryCtx) {
  const { partner } = await assertCurrentPartnerAccess(ctx);
  const organizations = await ctx.db
    .query("whiteLabelPartnerOrganizations")
    .withIndex("by_partnerId_and_status", (q) =>
      q.eq("partnerId", partner._id).eq("status", "active"),
    )
    .take(100);
  const rowsWithCustomers = await Promise.all(
    organizations.map(async (organization) => {
      const [team, plan, balance] = await Promise.all([
        ctx.db.get(organization.teamId),
        ctx.db
          .query("whiteLabelPartnerOrganizationPlans")
          .withIndex("by_partnerOrganizationId", (q) =>
            q.eq("partnerOrganizationId", organization._id),
          )
          .unique(),
        getPartnerCreditBalance(ctx, organization._id),
      ]);
      if (team === null || team.workosOrgId === undefined) {
        throw new Error("Customer organization workspace not found.");
      }
      if (balance.period === null) {
        throw new Error("Customer organization credit period not found.");
      }
      const invitations = await ctx.db
        .query("teamInvitationRecords")
        .withIndex("by_workosOrgId", (q) =>
          q.eq("workosOrgId", team.workosOrgId),
        )
        .take(100);
      const customers = invitations.flatMap((invitation) => {
        if (!isCustomerInvitation(invitation.state)) return [];
        return [
          {
            email: invitation.email,
            organizationName: team.name,
            role: orgRoleKeyFromWorkosSlug(invitation.roleSlug),
            invitationStatus: invitation.state,
          },
        ];
      });
      const planKey = plan?.activePlanKey ?? "free";
      return {
        organization: {
          partnerOrganizationId: organization._id,
          name: team.name,
          status: "active" as const,
          planKey,
          monthlyAllowance: PLAN_CATALOG[planKey].monthlyCredits,
          renewalAt: balance.period.periodEnd,
          customerCount: customers.length,
          addedCredits: balance.balance?.manualGrantedCredits ?? 0,
          spentCredits:
            balance.period.usedCredits +
            (balance.balance?.manualUsedCredits ?? 0),
          remainingCredits: balance.remainingCredits,
          lastGrantAt: balance.balance?.lastGrantAt ?? null,
          grantCount: balance.balance?.grantCount ?? 0,
        },
        customers,
      };
    }),
  );
  const rows = rowsWithCustomers.map((row) => row.organization);
  const customers = rowsWithCustomers.flatMap((row) => row.customers);
  const planMix = rows.reduce<Record<PlanKey, number>>(
    (mix, row) => {
      mix[row.planKey] += 1;
      return mix;
    },
    { free: 0, starter: 0, growth: 0, business: 0 },
  );
  return {
    activeOrganizations: rows.length,
    grantCount: rows.reduce((count, row) => count + row.grantCount, 0),
    totalGrantedCredits: rows.reduce(
      (total, row) => total + row.addedCredits,
      0,
    ),
    totalSpentCredits: rows.reduce(
      (total, row) => total + row.spentCredits,
      0,
    ),
    planMix,
    organizations: rows,
    customers,
  };
}
