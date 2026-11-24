import { afterEach, expect, test, vi } from "vitest";
import { pushFixture } from "../../tests/pushNotificationsFixture";
import { deliveryAccess } from "./access";
import { Permission } from "../../shared/permissions";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

test("organizational delivery stops when membership or role access is revoked", async () => {
  const { t, teamId, userId, agentId, device, subscriptionId } =
    await pushFixture();
  const memberId = await t.run(async (ctx) => {
    await ctx.db.patch(teamId, {
      type: "organizational",
      workosOrgId: "org-push",
      memberPermissions: [Permission.CHATS_READ],
    });
    await ctx.db.patch(agentId, { orgId: "org-push" });
    const membership = await ctx.db
      .query("teamMemberships")
      .withIndex("by_userId_and_teamId", (q) =>
        q.eq("userId", userId).eq("teamId", teamId),
      )
      .unique();
    await ctx.db.patch(membership!._id, { role: "member" });
    return membership!._id;
  });
  const read = () =>
    t.run(async (ctx) =>
      deliveryAccess(
        ctx,
        device,
        (await ctx.db.get(subscriptionId))!,
        "humanEscalation",
      ),
    );
  expect(await read()).not.toBeNull();
  await t.run((ctx) => ctx.db.patch(teamId, { memberPermissions: [] }));
  expect(await read()).toBeNull();
  await t.run((ctx) =>
    ctx.db.patch(teamId, { memberPermissions: [Permission.CHATS_READ] }),
  );
  await t.run((ctx) => ctx.db.delete(memberId));
  expect(await read()).toBeNull();
});

test("partner delivery uses its domain branding and stops after domain disconnection", async () => {
  const { t, teamId, userId, agentId, device, subscriptionId } =
    await pushFixture();
  const domainId = await t.run(async (ctx) => {
    const now = Date.now();
    const partnerId = await ctx.db.insert("whiteLabelPartners", {
      name: "Partner Demo",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(teamId, {
      type: "organizational",
      workosOrgId: "org-partner-push",
    });
    await ctx.db.patch(agentId, { orgId: "org-partner-push" });
    const organizationId = await ctx.db.insert(
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
    await ctx.db.insert("whiteLabelPartnerOrganizationAccounts", {
      partnerOrganizationId: organizationId,
      workosUserId: "push-owner",
      workosOrganizationMembershipId: "membership-one",
      email: "owner@example.com",
      role: "owner",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    const domainId = await ctx.db.insert("whiteLabelPartnerDomains", {
      partnerId,
      hostname: "partner.example.com",
      status: "active",
      setupState: "connected",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(subscriptionId, {
      partnerOrganizationId: organizationId,
    });
    await ctx.db.patch(device._id, { origin: "https://partner.example.com" });
    return domainId;
  });
  const read = () =>
    t.run(async (ctx) =>
      deliveryAccess(
        ctx,
        (await ctx.db.get(device._id))!,
        (await ctx.db.get(subscriptionId))!,
        "humanEscalation",
      ),
    );
  expect(await read()).toEqual({ name: "Partner Demo", icon: null });
  await t.run((ctx) =>
    ctx.db.patch(domainId, { setupState: "ownership_pending" }),
  );
  expect(await read()).toBeNull();
});

test("personal delivery rejects another owner even if a subscription record exists", async () => {
  const { t, agentId, device, subscriptionId } = await pushFixture();
  await t.run((ctx) => ctx.db.patch(agentId, { userId: "someone-else" }));
  expect(
    await t.run(async (ctx) =>
      deliveryAccess(
        ctx,
        device,
        (await ctx.db.get(subscriptionId))!,
        "humanEscalation",
      ),
    ),
  ).toBeNull();
});
