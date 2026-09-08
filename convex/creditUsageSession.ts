import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import {
  resolveAnalyticsTimeRange,
  resolveLatestBillingPeriod,
  type AnalyticsTimeRange,
} from "./analyticsTimeRange";
import { getEntitlementScope } from "./entitlementScope";
import type { PlanKey } from "./planCatalog";
import { getBillingEntityForUser, getPlanFromStripe } from "./plans";
import { getActiveTeamForUser, normalizeTimeZone, teamToOrgId } from "./teamHelpers";
import { getPartnerCreditBalance } from "./whiteLabel/creditLedger";
import { getWhiteLabelPlanForOrganization } from "./whiteLabel/planResolver";

export type CreditUsageSession = {
  kind: "native" | "partner";
  user: Doc<"users">;
  billingUserId: Id<"users">;
  plan: PlanKey;
  timeZone: string;
  rangeStartMs: number;
  rangeEndMs: number;
  orgId: string;
  team: Doc<"teams">;
};

export async function resolveCreditUsageSession(
  ctx: QueryCtx,
  timeRange: AnalyticsTimeRange,
): Promise<CreditUsageSession> {
  const scope = await getEntitlementScope(ctx);
  if (scope.kind === "partner") {
    const [balance, plan] = await Promise.all([
      getPartnerCreditBalance(ctx, scope.organization._id),
      getWhiteLabelPlanForOrganization(ctx, scope.organization._id),
    ]);
    if (plan === null) throw new Error("Customer organization plan not found.");
    if (balance.period === null) {
      throw new Error("Customer organization credit period not found.");
    }
    const timeZone = normalizeTimeZone(scope.team.timeZone);
    const { rangeStartMs, rangeEndMs } = resolveAnalyticsTimeRange(
      timeRange,
      balance.period.periodStart,
      balance.period.periodEnd,
    );
    return {
      kind: "partner",
      user: scope.user,
      billingUserId: scope.user._id,
      plan,
      timeZone,
      rangeStartMs,
      rangeEndMs,
      orgId: teamToOrgId(scope.team),
      team: scope.team,
    };
  }

  const activeTeam = await getActiveTeamForUser(ctx, scope.user);
  const timeZone = normalizeTimeZone(activeTeam.timeZone);
  const { billingUser } = await getBillingEntityForUser(ctx, scope.user);
  const stripeInfo = await getPlanFromStripe(ctx, billingUser.workosUserId);
  const { periodStartMs, periodEndMs } = resolveLatestBillingPeriod(
    billingUser.stripeSubscriptionCurrentPeriodEnd,
    timeZone,
  );
  const { rangeStartMs, rangeEndMs } = resolveAnalyticsTimeRange(
    timeRange,
    periodStartMs,
    periodEndMs,
  );
  return {
    kind: "native",
    user: scope.user,
    billingUserId: billingUser._id,
    plan: stripeInfo.plan,
    timeZone,
    rangeStartMs,
    rangeEndMs,
    orgId: teamToOrgId(activeTeam),
    team: activeTeam,
  };
}

export async function listAccountUsageWorkspaces(
  ctx: QueryCtx,
  session: CreditUsageSession,
) {
  if (session.kind === "partner") {
    return new Map([[session.orgId, session.team.name]]);
  }

  const memberships = await ctx.db
    .query("teamMemberships")
    .withIndex("by_userId", (q) => q.eq("userId", session.billingUserId))
    .collect();
  const workspacesMap = new Map<string, string>();
  for (const membership of memberships) {
    const team = await ctx.db.get(membership.teamId);
    if (team) {
      workspacesMap.set(
        teamToOrgId(team),
        team.type === "personal" ? "Personal Workspace" : team.name,
      );
    }
  }
  return workspacesMap;
}
