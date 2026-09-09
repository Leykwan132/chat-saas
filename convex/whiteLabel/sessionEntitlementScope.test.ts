import { convexTest } from "convex-test";
import { beforeEach, expect, test } from "vitest";
import stripeSchema from "../../node_modules/@convex-dev/stripe/dist/component/schema.js";
import { api, components } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import schema from "../schema";

const modules = import.meta.glob("/convex/**/*.ts");
const hostname = "chat.partner.example";
const issuer = "https://test.convex.site/partner-auth";

beforeEach(() => {
  process.env.CONVEX_SITE_URL = "https://test.convex.site";
});

function initTest() {
  const t = convexTest(schema, modules);
  t.registerComponent("stripe", stripeSchema, {
    public: () => import("../../node_modules/@convex-dev/stripe/dist/component/public.js"),
    private: () => import("../../node_modules/@convex-dev/stripe/dist/component/private.js"),
    "_generated/server": () =>
      import("../../node_modules/@convex-dev/stripe/dist/component/_generated/server.js"),
  });
  return t;
}

async function seedDualRole(t: ReturnType<typeof initTest>) {
  return await t.run(async (ctx) => {
    const now = Date.now();
    const workosUserId = "dual-role-user";
    const userId = await ctx.db.insert("users", {
      workosUserId,
      email: "dual@example.com",
      createdAt: now,
      updatedAt: now,
    });
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

    const organizationIds: Id<"whiteLabelPartnerOrganizations">[] = [];
    for (const [index, plan] of (["starter", "growth"] as const).entries()) {
      const teamId = await ctx.db.insert("teams", {
        type: "organizational",
        name: `Organization ${index + 1}`,
        workosOrgId: `partner-org-${index + 1}`,
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.insert("teamMemberships", {
        teamId,
        userId,
        role: "member",
        createdAt: now,
      });
      const organizationId = await ctx.db.insert("whiteLabelPartnerOrganizations", {
        partnerId,
        teamId,
        status: "active",
        createdByUserId: userId,
        createdAt: now,
        updatedAt: now,
      });
      organizationIds.push(organizationId);
      await ctx.db.insert("whiteLabelPartnerOrganizationAccounts", {
        partnerOrganizationId: organizationId,
        workosUserId,
        workosOrganizationMembershipId: `membership-${index + 1}`,
        email: "dual@example.com",
        role: "member",
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.insert("whiteLabelPartnerOrganizationPlans", {
        partnerOrganizationId: organizationId,
        activePlanKey: plan,
        creditPlanKey: plan,
        updatedByUserId: userId,
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.insert("whiteLabelPartnerOrganizationCreditPeriods", {
        partnerOrganizationId: organizationId,
        planKey: plan,
        periodStart: now - 1_000,
        periodEnd: now + 86_400_000,
        grantedCredits: (index + 1) * 1_000,
        usedCredits: (index + 1) * 100,
        createdAt: now,
        updatedAt: now,
      });
    }
    const firstOrganization = await ctx.db.get(organizationIds[0]);
    await ctx.db.patch(userId, { activeTeamId: firstOrganization!.teamId });
    return { workosUserId, partnerId, organizationIds, personalTeamId };
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
    email: "dual@example.com",
    surface: "partner",
    hostname,
    partnerId,
    partnerOrganizationId,
  };
}

test("native and partner sessions keep separate entitlement scopes", async () => {
  const t = initTest();
  const seeded = await seedDualRole(t);
  process.env.STRIPE_PRICE_BUSINESS_MONTHLY = "price_business_monthly";
  await t.mutation(components.stripe.private.handleSubscriptionCreated, {
    stripeSubscriptionId: "sub_dual_role_native",
    stripeCustomerId: "cus_dual_role_native",
    status: "active",
    currentPeriodEnd: 1_800_000_000,
    cancelAtPeriodEnd: false,
    priceId: "price_business_monthly",
    metadata: { orgId: seeded.workosUserId },
  });
  const native = t.withIdentity({
    subject: seeded.workosUserId,
    email: "dual@example.com",
  });

  const nativeUser = await native.query(api.users.currentUser, {});
  const nativeTeams = await native.query(api.teams.listForCurrentUser, {});
  expect(nativeUser?.plan).toBe("business");
  expect(nativeUser?.isPartnerManaged).toBe(false);
  expect(nativeTeams.map((team) => team._id)).toEqual([seeded.personalTeamId]);

  for (const [index, expectedPlan] of ["starter", "growth"].entries()) {
    const partner = t.withIdentity(partnerIdentity(
      seeded.workosUserId,
      seeded.partnerId,
      seeded.organizationIds[index]!,
    ));
    const currentUser = await partner.query(api.users.currentUser, {});
    const balance = await partner.query(api.credits.getBalance, {});
    const teams = await partner.query(api.teams.listForCurrentUser, {});
    expect(currentUser?.plan).toBe(expectedPlan);
    expect(currentUser?.isPartnerManaged).toBe(true);
    expect(balance?.credits).toBe((index + 1) * 900);
    expect(teams).toHaveLength(1);
  }
});

test("rejects mismatched partner JWT organization claims", async () => {
  const t = initTest();
  const seeded = await seedDualRole(t);
  await expect(
    t
      .withIdentity({
        subject: seeded.workosUserId,
        issuer,
        email: "dual@example.com",
      })
      .query(api.users.currentUser, {}),
  ).rejects.toThrow("ACCOUNT_UNAVAILABLE");
  const otherPartnerId = await t.run(async (ctx) => await ctx.db.insert(
    "whiteLabelPartners",
    {
      name: "Other",
      status: "active",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ));
  const invalid = t.withIdentity(partnerIdentity(
    seeded.workosUserId,
    otherPartnerId,
    seeded.organizationIds[0]!,
  ));
  await expect(invalid.query(api.users.currentUser, {})).rejects.toThrow(
    "ACCOUNT_UNAVAILABLE",
  );

  const validIdentity = partnerIdentity(
    seeded.workosUserId,
    seeded.partnerId,
    seeded.organizationIds[0]!,
  );
  const domainId = await t.run(async (ctx) => (
    await ctx.db
      .query("whiteLabelPartnerDomains")
      .withIndex("by_hostname", (q) => q.eq("hostname", hostname))
      .unique()
  )!._id);
  await t.run(async (ctx) => await ctx.db.patch(domainId, { status: "suspended" }));
  await expect(
    t.withIdentity(validIdentity).query(api.users.currentUser, {}),
  ).rejects.toThrow("ACCOUNT_UNAVAILABLE");

  await t.run(async (ctx) => {
    await ctx.db.patch(domainId, { status: "active" });
    const account = await ctx.db
      .query("whiteLabelPartnerOrganizationAccounts")
      .withIndex("by_partnerOrganizationId_and_workosUserId", (q) =>
        q
          .eq("partnerOrganizationId", seeded.organizationIds[0]!)
          .eq("workosUserId", seeded.workosUserId),
      )
      .unique();
    await ctx.db.delete(account!._id);
  });
  await expect(
    t.withIdentity(validIdentity).query(api.users.currentUser, {}),
  ).rejects.toThrow("ACCOUNT_UNAVAILABLE");
});

test("returns every active organization choice on the partner domain", async () => {
  const t = initTest();
  const seeded = await seedDualRole(t);
  const gateway = await import("./partnerAuthGateway");
  const choices = await t.run((ctx) => gateway.resolvePartnerOrganizationChoices(
    ctx,
    seeded.workosUserId,
    hostname,
  ));
  expect(choices.map((choice) => choice.id)).toEqual(seeded.organizationIds);
  const ambiguous = await t.run((ctx) => gateway.resolvePartnerSurfaceForWorkosUser(
    ctx,
    seeded.workosUserId,
    hostname,
  ));
  expect(ambiguous).toBeNull();
  for (const organizationId of seeded.organizationIds) {
    const selected = await t.run((ctx) => gateway.resolvePartnerSurfaceForWorkosUser(
      ctx,
      seeded.workosUserId,
      hostname,
      organizationId,
    ));
    expect(selected?.partnerOrganizationId).toBe(organizationId);
  }
});
