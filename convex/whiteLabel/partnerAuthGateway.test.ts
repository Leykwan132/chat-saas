import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "../schema";

const modules = import.meta.glob("/convex/**/*.ts");

test("resolves connected hostname branding and the matching customer surface", async () => {
  const t = convexTest(schema, modules);
  const { hostname, partnerOrganizationId, workosUserId } = await t.run(
    async (ctx) => {
      const now = Date.now();
      const ownerId = await ctx.db.insert("users", {
        workosUserId: "partner-owner",
        email: "owner@example.com",
        createdAt: now,
        updatedAt: now,
      });
      const partnerId = await ctx.db.insert("whiteLabelPartners", {
        name: "Acme",
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
      const teamId = await ctx.db.insert("teams", {
        type: "organizational",
        name: "Acme customer workspace",
        ownerId,
        workosOrgId: "acme-customer-org",
        createdAt: now,
        updatedAt: now,
      });
      const partnerOrganizationId = await ctx.db.insert(
        "whiteLabelPartnerOrganizations",
        {
          partnerId,
          teamId,
          status: "active",
          createdByUserId: ownerId,
          createdAt: now,
          updatedAt: now,
        },
      );
      const hostname = "app.acme.example";
      await ctx.db.insert("whiteLabelPartnerDomains", {
        partnerId,
        hostname,
        status: "active",
        setupState: "connected",
        createdAt: now,
        updatedAt: now,
      });
      const workosUserId = "acme-customer";
      await ctx.db.insert("whiteLabelPartnerOrganizationAccounts", {
        partnerOrganizationId,
        workosUserId,
        workosOrganizationMembershipId: "membership-acme-customer",
        email: "customer@example.com",
        role: "member",
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
      return { hostname, partnerOrganizationId, workosUserId };
    },
  );

  const gateway = await import("./partnerAuthGateway");
  const brand = await t.run((ctx) =>
    gateway.resolvePartnerBrandForHostname(ctx, hostname),
  );
  const surface = await t.run((ctx) =>
    gateway.resolvePartnerSurfaceForWorkosUser(ctx, workosUserId, hostname),
  );

  expect(brand).toMatchObject({ hostname, partnerName: "Acme" });
  expect(surface).toMatchObject({
    kind: "partner",
    hostname,
    partnerOrganizationId,
  });
});

test("does not authorize a customer for another partner hostname", async () => {
  const t = convexTest(schema, modules);
  const { hostname, workosUserId } = await t.run(async (ctx) => {
    const now = Date.now();
    const ownerId = await ctx.db.insert("users", {
      workosUserId: "partner-owner",
      email: "owner@example.com",
      createdAt: now,
      updatedAt: now,
    });
    const customerPartnerId = await ctx.db.insert("whiteLabelPartners", {
      name: "Customer partner",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    const otherPartnerId = await ctx.db.insert("whiteLabelPartners", {
      name: "Other partner",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    const customerTeamId = await ctx.db.insert("teams", {
      type: "organizational",
      name: "Customer workspace",
      ownerId,
      workosOrgId: "customer-org",
      createdAt: now,
      updatedAt: now,
    });
    const otherTeamId = await ctx.db.insert("teams", {
      type: "organizational",
      name: "Other workspace",
      ownerId,
      workosOrgId: "other-org",
      createdAt: now,
      updatedAt: now,
    });
    const customerOrganizationId = await ctx.db.insert(
      "whiteLabelPartnerOrganizations",
      {
        partnerId: customerPartnerId,
        teamId: customerTeamId,
        status: "active",
        createdByUserId: ownerId,
        createdAt: now,
        updatedAt: now,
      },
    );
    await ctx.db.insert("whiteLabelPartnerOrganizations", {
      partnerId: otherPartnerId,
      teamId: otherTeamId,
      status: "active",
      createdByUserId: ownerId,
      createdAt: now,
      updatedAt: now,
    });
    const hostname = "app.other.example";
    await ctx.db.insert("whiteLabelPartnerDomains", {
      partnerId: otherPartnerId,
      hostname,
      status: "active",
      setupState: "connected",
      createdAt: now,
      updatedAt: now,
    });
    const workosUserId = "customer";
    await ctx.db.insert("whiteLabelPartnerOrganizationAccounts", {
      partnerOrganizationId: customerOrganizationId,
      workosUserId,
      workosOrganizationMembershipId: "customer-membership",
      email: "customer@example.com",
      role: "member",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    return { hostname, workosUserId };
  });

  const gateway = await import("./partnerAuthGateway");
  const surface = await t.run((ctx) =>
    gateway.resolvePartnerSurfaceForWorkosUser(ctx, workosUserId, hostname),
  );

  expect(surface).toBeNull();
});
