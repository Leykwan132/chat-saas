import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "../schema";

const modules = import.meta.glob("/convex/**/*.ts");

test("resolves root and child teams to their partner organization", async () => {
  const t = convexTest(schema, modules);
  const { childTeamId, partnerOrganizationId, rootTeamId } = await t.run(
    async (ctx) => {
      const now = Date.now();
      const ownerId = await ctx.db.insert("users", {
        workosUserId: "partner-owner",
        email: "owner@example.com",
        createdAt: now,
        updatedAt: now,
      });
      const partnerId = await ctx.db.insert("whiteLabelPartners", {
        name: "Partner",
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
      const rootTeamId = await ctx.db.insert("teams", {
        type: "organizational",
        name: "Customer workspace",
        ownerId,
        workosOrgId: "root-org",
        createdAt: now,
        updatedAt: now,
      });
      const childTeamId = await ctx.db.insert("teams", {
        type: "organizational",
        name: "Customer child workspace",
        ownerId,
        workosOrgId: "child-org",
        createdAt: now,
        updatedAt: now,
      });
      const partnerOrganizationId = await ctx.db.insert(
        "whiteLabelPartnerOrganizations",
        {
          partnerId,
          teamId: rootTeamId,
          status: "active",
          createdByUserId: ownerId,
          createdAt: now,
          updatedAt: now,
        },
      );
      await ctx.db.insert("whiteLabelPartnerManagedTeams", {
        partnerOrganizationId,
        teamId: childTeamId,
        createdByUserId: ownerId,
        createdAt: now,
        updatedAt: now,
      });
      return { childTeamId, partnerOrganizationId, rootTeamId };
    },
  );

  const managedTeamsModule = await import("./managedTeams");
  const rootOrganization = await t.run((ctx) =>
    managedTeamsModule.getPartnerOrganizationForManagedTeam(ctx, rootTeamId),
  );
  const childOrganization = await t.run((ctx) =>
    managedTeamsModule.getPartnerOrganizationForManagedTeam(ctx, childTeamId),
  );

  expect(rootOrganization?._id).toBe(partnerOrganizationId);
  expect(childOrganization?._id).toBe(partnerOrganizationId);
});

test("rejects a child team from a different partner organization", async () => {
  const t = convexTest(schema, modules);
  const { childTeamId, otherPartnerOrganizationId } = await t.run(
    async (ctx) => {
      const now = Date.now();
      const ownerId = await ctx.db.insert("users", {
        workosUserId: "partner-owner",
        email: "owner@example.com",
        createdAt: now,
        updatedAt: now,
      });
      const firstPartnerId = await ctx.db.insert("whiteLabelPartners", {
        name: "First partner",
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
      const secondPartnerId = await ctx.db.insert("whiteLabelPartners", {
        name: "Second partner",
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
      const firstRootTeamId = await ctx.db.insert("teams", {
        type: "organizational",
        name: "First customer workspace",
        ownerId,
        workosOrgId: "first-root-org",
        createdAt: now,
        updatedAt: now,
      });
      const childTeamId = await ctx.db.insert("teams", {
        type: "organizational",
        name: "First customer child workspace",
        ownerId,
        workosOrgId: "first-child-org",
        createdAt: now,
        updatedAt: now,
      });
      const secondRootTeamId = await ctx.db.insert("teams", {
        type: "organizational",
        name: "Second customer workspace",
        ownerId,
        workosOrgId: "second-root-org",
        createdAt: now,
        updatedAt: now,
      });
      const firstPartnerOrganizationId = await ctx.db.insert(
        "whiteLabelPartnerOrganizations",
        {
          partnerId: firstPartnerId,
          teamId: firstRootTeamId,
          status: "active",
          createdByUserId: ownerId,
          createdAt: now,
          updatedAt: now,
        },
      );
      const otherPartnerOrganizationId = await ctx.db.insert(
        "whiteLabelPartnerOrganizations",
        {
          partnerId: secondPartnerId,
          teamId: secondRootTeamId,
          status: "active",
          createdByUserId: ownerId,
          createdAt: now,
          updatedAt: now,
        },
      );
      await ctx.db.insert("whiteLabelPartnerManagedTeams", {
        partnerOrganizationId: firstPartnerOrganizationId,
        teamId: childTeamId,
        createdByUserId: ownerId,
        createdAt: now,
        updatedAt: now,
      });
      return { childTeamId, otherPartnerOrganizationId };
    },
  );

  const managedTeamsModule = await import("./managedTeams");
  await expect(
    t.run((ctx) =>
      managedTeamsModule.assertManagedTeamBelongsToPartner(
        ctx,
        childTeamId,
        otherPartnerOrganizationId,
      ),
    ),
  ).rejects.toThrow("Partner-managed team is unavailable");
});
