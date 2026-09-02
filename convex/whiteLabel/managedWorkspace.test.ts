import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "../../convex/_generated/api";
import schema from "../../convex/schema";

const modules = import.meta.glob("/convex/**/*.ts");

test("identifies the current partner customer workspace as managed", async () => {
  const t = convexTest(schema, modules);
  const workosUserId = "customer-owner";
  const workosOrgId = "org-customer";

  await t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      workosUserId,
      email: "customer@example.com",
      createdAt: now,
      updatedAt: now,
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
    await ctx.db.insert("whiteLabelPartnerOrganizations", {
      partnerId,
      teamId,
      status: "active",
      createdByUserId: userId,
      createdAt: now,
      updatedAt: now,
    });
  });

  const managed = await t
    .withIdentity({
      subject: workosUserId,
      email: "customer@example.com",
      orgId: workosOrgId,
    })
    .query(api.whiteLabel.billing.isPartnerManagedCurrentWorkspace, {});

  expect(managed).toBe(true);
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
    await ctx.db.insert("whiteLabelPartnerOrganizations", {
      partnerId,
      teamId,
      status: "active",
      createdByUserId: userId,
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
