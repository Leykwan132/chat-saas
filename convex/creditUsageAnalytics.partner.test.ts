import { convexTest } from "convex-test";
import { beforeEach, expect, test, vi } from "vitest";
import stripeSchema from "../node_modules/@convex-dev/stripe/dist/component/schema.js";
import { api, components } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("/convex/**/*.ts");
const hostname = "chat.partner.example";
const issuer = "https://test.convex.site/partner-auth";

test.each(["agent", "workspace", "account"] as const)("%s history keeps rolling range bounds stable across pages", async (scope) => {
  const t = initTest();
  const seeded = await seedPartnerCustomer(t);
  const referenceTimeMs = Date.now();
  await t.run(async (ctx) => {
    for (let index = 0; index < 3; index += 1) {
      const createdAt = referenceTimeMs - (index + 1) * 1000;
      const creditLogId = await ctx.db.insert("creditLogs", {
        orgId: seeded.orgId, userId: seeded.userId, amount: -1, type: "deduction", eventType: "usage", balanceBefore: 100, balanceAfter: 99, creditCost: 1, agentId: seeded.agentId, createdAt,
      });
      await ctx.db.insert("creditUsageEvents", { userId: seeded.userId, orgId: seeded.orgId, agentId: seeded.agentId, credits: 1, creditLogId, createdAt });
    }
  });
  const partner = t.withIdentity(partnerIdentity(seeded.workosUserId, seeded.partnerId, seeded.partnerOrganizationId));
  const loadPage = (cursor: string | null) => {
    const args = { timeRange: "7d" as const, referenceTimeMs, paginationOpts: { numItems: 1, cursor } };
    if (scope === "agent") return partner.query(api.creditUsageAnalytics.getAgentCreditSpendHistory, { ...args, agentId: seeded.agentId });
    if (scope === "workspace") return partner.query(api.creditUsageAnalytics.getWorkspaceCreditSpendHistory, { ...args, workspaceId: seeded.orgId });
    return partner.query(api.creditUsageAnalytics.getAccountCreditSpendHistory, args);
  };
  const first = await loadPage(null);
  expect(first.isDone).toBe(false);
  const clock = vi.spyOn(Date, "now").mockReturnValue(referenceTimeMs + 60_000);
  try {
    const second = await loadPage(first.continueCursor);
    expect(second.periodStartMs).toBe(first.periodStartMs);
    expect(second.periodEndMs).toBe(referenceTimeMs);
    expect(second.page).toHaveLength(1);
    expect(second.page[0].id).not.toBe(first.page[0].id);
  } finally {
    clock.mockRestore();
  }
});

beforeEach(() => {
  process.env.CONVEX_SITE_URL = "https://test.convex.site";
});

function initTest() {
  const t = convexTest(schema, modules);
  t.registerComponent("stripe", stripeSchema, {
    public: () => import("../node_modules/@convex-dev/stripe/dist/component/public.js"),
    private: () => import("../node_modules/@convex-dev/stripe/dist/component/private.js"),
    "_generated/server": () =>
      import("../node_modules/@convex-dev/stripe/dist/component/_generated/server.js"),
  });
  return t;
}

async function seedPartnerCustomer(
  t: ReturnType<typeof initTest>,
  args: { withPersonalTeam?: boolean } = {},
) {
  return await t.run(async (ctx) => {
    const now = Date.now();
    const periodStart = now - 3_600_000;
    const periodEnd = now + 86_400_000;
    const workosUserId = "partner-customer";
    const userId = await ctx.db.insert("users", {
      workosUserId,
      email: "customer@partner.test",
      createdAt: now,
      updatedAt: now,
    });
    if (args.withPersonalTeam) {
      const personalTeamId = await ctx.db.insert("teams", {
        type: "personal",
        name: "Personal",
        ownerId: userId,
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.insert("teamMemberships", {
        teamId: personalTeamId,
        userId,
        role: "owner",
        createdAt: now,
      });
    }
    const partnerId = await ctx.db.insert("whiteLabelPartners", {
      name: "Partner",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("whiteLabelPartnerDomains", {
      partnerId,
      hostname,
      status: "active",
      setupState: "connected",
      createdAt: now,
      updatedAt: now,
    });
    const teamId = await ctx.db.insert("teams", {
      type: "organizational",
      name: "Customer Org",
      workosOrgId: "partner-org-customer",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("teamMemberships", {
      teamId,
      userId,
      role: "member",
      createdAt: now,
    });
    const partnerOrganizationId = await ctx.db.insert("whiteLabelPartnerOrganizations", {
      partnerId,
      teamId,
      status: "active",
      createdByUserId: userId,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("whiteLabelPartnerOrganizationAccounts", {
      partnerOrganizationId,
      workosUserId,
      workosOrganizationMembershipId: "membership-customer",
      email: "customer@partner.test",
      role: "member",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("whiteLabelPartnerOrganizationPlans", {
      partnerOrganizationId,
      activePlanKey: "growth",
      creditPlanKey: "growth",
      updatedByUserId: userId,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("whiteLabelPartnerOrganizationCreditPeriods", {
      partnerOrganizationId,
      planKey: "growth",
      periodStart,
      periodEnd,
      grantedCredits: 8000,
      usedCredits: 250,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(userId, { activeTeamId: teamId });
    const agentId = await ctx.db.insert("agents", {
      name: "Partner Agent",
      provider: "openrouter",
      model: "deepseek/deepseek-v4-flash",
      systemPrompt: "Test",
      templateKey: "blank",
      fileSize: 0,
      userId: workosUserId,
      orgId: "partner-org-customer",
      createdAt: now,
      updatedAt: now,
    });
    return {
      workosUserId,
      userId,
      agentId,
      partnerId,
      partnerOrganizationId,
      orgId: "partner-org-customer",
      periodStart,
      periodEnd,
    };
  });
}

function partnerIdentity(
  workosUserId: string,
  partnerId: Id<"whiteLabelPartners">,
  partnerOrganizationId: Id<"whiteLabelPartnerOrganizations">,
) {
  return {
    subject: workosUserId,
    issuer,
    email: "customer@partner.test",
    surface: "partner",
    hostname,
    partnerId,
    partnerOrganizationId,
  };
}

test("partner sessions load account credit usage from the signed organization", async () => {
  const t = initTest();
  const seeded = await seedPartnerCustomer(t);
  const partner = t.withIdentity(
    partnerIdentity(seeded.workosUserId, seeded.partnerId, seeded.partnerOrganizationId),
  );

  const usage = await partner.query(api.creditUsageAnalytics.getAccountCreditUsage, {
    timeRange: "period",
  });
  expect(usage?.plan).toBe("growth");
  expect(usage?.periodStartMs).toBe(seeded.periodStart);
  expect(usage?.periodEndMs).toBe(seeded.periodEnd);
  expect(usage?.totalCreditsUsed).toBe(0);

  const workspace = await partner.query(api.creditUsageAnalytics.getWorkspaceCreditUsage, {
    workspaceId: seeded.orgId,
    timeRange: "period",
  });
  expect(workspace?.plan).toBe("growth");

  const history = await partner.query(api.creditUsageAnalytics.getAccountCreditSpendHistory, {
    timeRange: "period",
    paginationOpts: { numItems: 10, cursor: null },
  });
  expect(history.page).toEqual([]);
});

test("partner sessions load agent credit usage from the signed organization", async () => {
  const t = initTest();
  const seeded = await seedPartnerCustomer(t);
  await t.run(async (ctx) => {
    const createdAt = seeded.periodStart + 1_000;
    const creditLogId = await ctx.db.insert("creditLogs", {
      orgId: seeded.orgId,
      userId: seeded.userId,
      amount: -40,
      type: "deduction",
      eventType: "usage",
      balanceBefore: 8000,
      balanceAfter: 7960,
      creditCost: 40,
      modelId: "deepseek/deepseek-v4-flash",
      agentId: seeded.agentId,
      createdAt,
    });
    await ctx.db.insert("creditUsageEvents", {
      userId: seeded.userId,
      orgId: seeded.orgId,
      agentId: seeded.agentId,
      modelId: "deepseek/deepseek-v4-flash",
      credits: 40,
      creditLogId,
      createdAt,
    });
  });
  const partner = t.withIdentity(
    partnerIdentity(seeded.workosUserId, seeded.partnerId, seeded.partnerOrganizationId),
  );

  const usage = await partner.query(api.creditUsageAnalytics.getAgentCreditUsage, {
    agentId: seeded.agentId,
    timeRange: "period",
  });
  expect(usage?.plan).toBe("growth");
  expect(usage?.periodStartMs).toBe(seeded.periodStart);
  expect(usage?.periodEndMs).toBe(seeded.periodEnd);
  expect(usage?.totalCreditsUsed).toBe(40);

  const history = await partner.query(api.creditUsageAnalytics.getAgentCreditSpendHistory, {
    agentId: seeded.agentId,
    timeRange: "period",
    paginationOpts: { numItems: 10, cursor: null },
  });
  expect(history.periodStartMs).toBe(seeded.periodStart);
  expect(history.page).toHaveLength(1);
  expect(history.page[0]?.credits).toBe(40);
});

test("partner account usage keeps the organization plan when a personal Stripe team exists", async () => {
  const t = initTest();
  const seeded = await seedPartnerCustomer(t, { withPersonalTeam: true });
  process.env.STRIPE_PRICE_BUSINESS_MONTHLY = "price_business_monthly";
  await t.mutation(components.stripe.private.handleSubscriptionCreated, {
    stripeSubscriptionId: "sub_partner_usage",
    stripeCustomerId: "cus_partner_usage",
    status: "active",
    currentPeriodEnd: 1_800_000_000,
    cancelAtPeriodEnd: false,
    priceId: "price_business_monthly",
    metadata: { orgId: seeded.workosUserId },
  });

  const usage = await t
    .withIdentity(
      partnerIdentity(seeded.workosUserId, seeded.partnerId, seeded.partnerOrganizationId),
    )
    .query(api.creditUsageAnalytics.getAccountCreditUsage, { timeRange: "period" });
  expect(usage?.plan).toBe("growth");
});
