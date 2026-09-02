import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "../_generated/api";
import { getAuthContext } from "../authUtils";
import schema from "../schema";

const modules = import.meta.glob("/convex/**/*.ts");

test("provisions a partner customer directly into its assigned workspace", async () => {
  const t = convexTest(schema, modules);
  const workosUserId = "partner-customer";
  const { partnerOrganizationId, assignedTeamId, otherTeamId } = await t.run(
    async (ctx) => {
      const now = Date.now();
      const managerId = await ctx.db.insert("users", {
        workosUserId: "partner-manager",
        email: "manager@example.com",
        createdAt: now,
        updatedAt: now,
      });
      const assignedTeamId = await ctx.db.insert("teams", {
        type: "organizational",
        name: "Assigned customer workspace",
        workosOrgId: "customer-org",
        createdAt: now,
        updatedAt: now,
      });
      const otherTeamId = await ctx.db.insert("teams", {
        type: "organizational",
        name: "Other workspace",
        workosOrgId: "other-org",
        createdAt: now,
        updatedAt: now,
      });
      const partnerId = await ctx.db.insert("whiteLabelPartners", {
        name: "Partner",
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
      const partnerOrganizationId = await ctx.db.insert(
        "whiteLabelPartnerOrganizations",
        {
          partnerId,
          teamId: assignedTeamId,
          status: "active",
          createdByUserId: managerId,
          createdAt: now,
          updatedAt: now,
        },
      );
      await ctx.db.insert("whiteLabelPartnerOrganizationPlans", {
        partnerOrganizationId,
        activePlanKey: "starter",
        creditPlanKey: "starter",
        updatedByUserId: managerId,
        createdAt: now,
        updatedAt: now,
      });
      return { partnerOrganizationId, assignedTeamId, otherTeamId };
    },
  );

  await t.mutation(internal.whiteLabel.customerAccounts.persistActiveAccount, {
    partnerOrganizationId,
    workosUserId,
    workosOrganizationMembershipId: "membership-customer",
    email: "customer@example.com",
    role: "member",
    credential: {
      ciphertext: "ciphertext",
      initializationVector: "initialization-vector",
      authenticationTag: "authentication-tag",
      keyVersion: "v1",
    },
  });

  await t.mutation(
    internal.whiteLabel.customerRoleRecords.updateCustomerRoleRecord,
    {
      partnerOrganizationId,
      workosUserId,
      role: "admin",
    },
  );

  await t.run(async (ctx) => {
    const customer = await ctx.db
      .query("users")
      .withIndex("by_workosUserId", (q) => q.eq("workosUserId", workosUserId))
      .unique();
    expect(customer).not.toBeNull();
    expect(customer?.onboarded).toBeUndefined();

    const personalTeam = await ctx.db
      .query("teams")
      .withIndex("by_ownerId_and_type", (q) =>
        q.eq("ownerId", customer!._id).eq("type", "personal"),
      )
      .first();
    expect(personalTeam).not.toBeNull();
    expect(customer?.activeTeamId).toBe(personalTeam?._id);

    const assignedMembership = await ctx.db
      .query("teamMemberships")
      .withIndex("by_userId_and_teamId", (q) =>
        q.eq("userId", customer!._id).eq("teamId", assignedTeamId),
      )
      .unique();
    expect(assignedMembership?.role).toBe("admin");

    const account = await ctx.db
      .query("whiteLabelPartnerOrganizationAccounts")
      .withIndex("by_partnerOrganizationId_and_workosUserId", (q) =>
        q
          .eq("partnerOrganizationId", partnerOrganizationId)
          .eq("workosUserId", workosUserId),
      )
      .unique();
    expect(account?.role).toBe("admin");

    await ctx.db.insert("teamMemberships", {
      teamId: otherTeamId,
      userId: customer!._id,
      role: "member",
      createdAt: Date.now(),
    });
  });

  const customer = t.withIdentity({
    subject: workosUserId,
    email: "customer@example.com",
    orgId: "customer-org",
  });
  await expect(
    customer.run(async (ctx) => await getAuthContext(ctx, "other-org")),
  ).resolves.toMatchObject({ orgId: "other-org" });

  await expect(
    customer.mutation(api.teams.switchActiveTeam, { teamId: otherTeamId }),
  ).resolves.toMatchObject({ teamId: otherTeamId });
});
