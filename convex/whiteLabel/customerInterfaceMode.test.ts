import { convexTest } from "convex-test";
import { makeFunctionReference } from "convex/server";
import { expect, test } from "vitest";
import schema from "../schema";
import type { Id } from "../_generated/dataModel";

const modules = import.meta.glob("/convex/**/*.ts");
const update = makeFunctionReference<
  "mutation",
  {
    partnerOrganizationId: Id<"whiteLabelPartnerOrganizations">;
    workosUserId: string;
    interfaceMode: "normal" | "focus";
  },
  null
>("whiteLabel/customerInterfaceMode:update");

test("only the owning partner can edit a customer mode", async () => {
  process.env.CONVEX_SITE_URL = "https://test.convex.site";
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      workosUserId: "manager",
      email: "manager@example.com",
      createdAt: now,
      updatedAt: now,
    });
    const teamId = await ctx.db.insert("teams", {
      type: "organizational",
      name: "Team",
      workosOrgId: "org",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("teamMemberships", {
      teamId,
      userId,
      role: "owner",
      createdAt: now,
    });
    await ctx.db.patch(userId, { activeTeamId: teamId });
    const partnerId = await ctx.db.insert("whiteLabelPartners", {
      name: "Partner",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("whiteLabelPartnerAccess", {
      partnerId,
      role: "owner",
      email: "manager@example.com",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    const partnerOrganizationId = await ctx.db.insert(
      "whiteLabelPartnerOrganizations",
      {
        partnerId,
        teamId,
        status: "active",
        createdByUserId: userId,
        createdAt: now,
        updatedAt: now,
      },
    );
    const accountId = await ctx.db.insert(
      "whiteLabelPartnerOrganizationAccounts",
      {
        partnerOrganizationId,
        workosUserId: "customer",
        workosOrganizationMembershipId: "membership",
        email: "customer@example.com",
        role: "member",
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
    );
    const personalTeamId = await ctx.db.insert("teams", {
      type: "personal",
      name: "Personal",
      ownerId: userId,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(userId, { activeTeamId: personalTeamId });
    await ctx.db.insert("whiteLabelPartnerDomains", {
      partnerId,
      hostname: "chat.partner.example",
      status: "active",
      setupState: "connected",
      createdAt: now,
      updatedAt: now,
    });
    return { partnerOrganizationId, accountId, partnerId };
  });
  const current = makeFunctionReference<
    "query",
    Record<string, never>,
    { interfaceMode: "normal" | "focus"; agentId: string | null }
  >("whiteLabel/customerInterfaceMode:current");
  const manager = t.withIdentity({
    subject: "manager",
    org_id: "org",
    email: "manager@example.com",
  });
  expect(await manager.query(current, {})).toEqual({
    interfaceMode: "normal",
    managed: false,
    agentId: null,
  });
  await t.run(async (ctx) => {
    const organization = await ctx.db.get(ids.partnerOrganizationId);
    if (!organization) throw new Error("Missing organization");
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      workosUserId: "customer",
      email: "customer@example.com",
      activeTeamId: organization.teamId,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("teamMemberships", {
      userId,
      teamId: organization.teamId,
      role: "member",
      createdAt: now,
    });
  });
  const customer = t.withIdentity({
    subject: "customer",
    issuer: "https://test.convex.site/partner-auth",
    surface: "partner",
    hostname: "chat.partner.example",
    partnerId: ids.partnerId,
    partnerOrganizationId: ids.partnerOrganizationId,
    org_id: "org",
    email: "customer@example.com",
  });
  expect((await customer.query(current, {})).interfaceMode).toBe("normal");
  await manager.mutation(update, {
    partnerOrganizationId: ids.partnerOrganizationId,
    workosUserId: "customer",
    interfaceMode: "focus",
  });
  expect(
    await t.run(
      async (ctx) => (await ctx.db.get(ids.accountId))?.interfaceMode,
    ),
  ).toBe("focus");
  expect((await customer.query(current, {})).interfaceMode).toBe("focus");
  await manager.mutation(update, {
    partnerOrganizationId: ids.partnerOrganizationId,
    workosUserId: "customer",
    interfaceMode: "normal",
  });
  expect(
    await t.run(
      async (ctx) => (await ctx.db.get(ids.accountId))?.interfaceMode,
    ),
  ).toBe("normal");
  await expect(
    t
      .withIdentity({ subject: "intruder", email: "intruder@example.com" })
      .mutation(update, {
        partnerOrganizationId: ids.partnerOrganizationId,
        workosUserId: "customer",
        interfaceMode: "focus",
      }),
  ).rejects.toThrow();
});
