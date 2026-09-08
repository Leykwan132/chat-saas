import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import stripeSchema from "../../node_modules/@convex-dev/stripe/dist/component/schema.js";

const modules = import.meta.glob("/convex/**/*.ts");

async function seedOwnerInsideWhiteLabelWorkspace(
  t: ReturnType<typeof convexTest>,
  workosUserId: string,
  workosOrgId: string,
) {
  await t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      workosUserId,
      email: "customer@example.com",
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
    const teamId = await ctx.db.insert("teams", {
      type: "organizational",
      name: "Customer workspace",
      ownerId: userId,
      workosOrgId,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(userId, { activeTeamId: teamId });
    await ctx.db.insert("teamMemberships", {
      teamId,
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
    const partnerOrganizationId = await ctx.db.insert("whiteLabelPartnerOrganizations", {
      partnerId,
      teamId,
      status: "active",
      createdByUserId: userId,
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
  });
}

test("does not treat a partner owner's customer workspace membership as partner-managed access", async () => {
  const t = convexTest(schema, modules);
  const workosUserId = "customer-owner";
  const workosOrgId = "org-customer";
  await seedOwnerInsideWhiteLabelWorkspace(t, workosUserId, workosOrgId);

  const managed = await t
    .withIdentity({
      subject: workosUserId,
      email: "customer@example.com",
      orgId: workosOrgId,
    })
    .query(api.whiteLabel.billing.isPartnerManagedCurrentWorkspace, {});

  expect(managed).toBe(false);
});

test("currentUser keeps a partner owner on Stripe even when a customer team was persisted as active", async () => {
  const t = convexTest(schema, modules);
  t.registerComponent("stripe", stripeSchema, {
    public: () => import("../../node_modules/@convex-dev/stripe/dist/component/public.js"),
    private: () => import("../../node_modules/@convex-dev/stripe/dist/component/private.js"),
    "_generated/server": () =>
      import("../../node_modules/@convex-dev/stripe/dist/component/_generated/server.js"),
  });
  const workosUserId = "partner-owner";
  const workosOrgId = "org-partner-customer";
  await seedOwnerInsideWhiteLabelWorkspace(t, workosUserId, workosOrgId);

  const currentUser = await t
    .withIdentity({
      subject: workosUserId,
      email: "customer@example.com",
      orgId: workosOrgId,
    })
    .query(api.users.currentUser, {});

  expect(currentUser?.isPartnerManaged).toBe(false);
  expect(currentUser?.plan).toBe("free");

  const teams = await t
    .withIdentity({
      subject: workosUserId,
      email: "customer@example.com",
      orgId: workosOrgId,
    })
    .query(api.teams.listForCurrentUser, {});
  expect(teams).toHaveLength(1);
  expect(teams[0]?.type).toBe("personal");

  const customerTeamId = await t.run(async (ctx) => {
    const team = await ctx.db
      .query("teams")
      .withIndex("by_workosOrgId", (q) => q.eq("workosOrgId", workosOrgId))
      .unique();
    return team!._id;
  });
  await expect(
    t
      .withIdentity({
        subject: workosUserId,
        email: "customer@example.com",
        orgId: workosOrgId,
      })
      .mutation(api.teams.switchActiveTeam, { teamId: customerTeamId }),
  ).rejects.toThrow(
    "Partner customer workspaces are only available through the partner domain",
  );
});

test("blocks customer members from normal workspace invitations", async () => {
  const t = convexTest(schema, modules);
  const workosUserId = "customer-admin";
  const workosOrgId = "org-managed";

  await t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      workosUserId,
      email: "customer-admin@example.com",
      createdAt: now,
      updatedAt: now,
    });
    const teamId = await ctx.db.insert("teams", {
      type: "organizational",
      name: "Managed customer workspace",
      ownerId: userId,
      workosOrgId,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(userId, { activeTeamId: teamId });
    await ctx.db.insert("teamMemberships", {
      teamId,
      userId,
      role: "admin",
      createdAt: now,
    });
    const partnerId = await ctx.db.insert("whiteLabelPartners", {
      name: "Partner",
      status: "active",
      createdAt: now,
      updatedAt: now,
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
      workosOrganizationMembershipId: "membership-customer-admin",
      email: "customer-admin@example.com",
      role: "admin",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
  });

  const gate = await t
    .withIdentity({
      subject: workosUserId,
      email: "customer-admin@example.com",
      orgId: workosOrgId,
    })
    .query(api.teams.canInviteMembers, {});

  expect(gate).toMatchObject({
    allowed: false,
    requiresPlanUpgrade: false,
    reason: "Partner-managed workspaces can only be staffed from the Partner portal.",
  });
});
