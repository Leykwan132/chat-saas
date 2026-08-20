import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("/convex/**/*.ts");

async function createFixture() {
  const client = convexTest(schema, modules);
  const now = Date.now();
  const { domainId, partnerId } = await client.run(async (ctx) => {
    const partnerUserId = await ctx.db.insert("users", {
      workosUserId: "partner-owner",
      email: "partner@example.com",
      createdAt: now,
      updatedAt: now,
    });
    const partnerTeamId = await ctx.db.insert("teams", {
      type: "personal",
      name: "Partner workspace",
      ownerId: partnerUserId,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("teamMemberships", {
      teamId: partnerTeamId,
      userId: partnerUserId,
      role: "owner",
      createdAt: now,
    });
    await ctx.db.patch(partnerUserId, { activeTeamId: partnerTeamId });
    const otherUserId = await ctx.db.insert("users", {
      workosUserId: "other-user",
      email: "other@example.com",
      createdAt: now,
      updatedAt: now,
    });
    const otherTeamId = await ctx.db.insert("teams", {
      type: "personal",
      name: "Other workspace",
      ownerId: otherUserId,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("teamMemberships", {
      teamId: otherTeamId,
      userId: otherUserId,
      role: "owner",
      createdAt: now,
    });
    await ctx.db.patch(otherUserId, { activeTeamId: otherTeamId });
    const partnerId = await ctx.db.insert("whiteLabelPartners", {
      controlTeamId: partnerTeamId,
      name: "Partner",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("whiteLabelPartnerAccess", {
      partnerId,
      workosUserId: "partner-owner",
      email: "partner@example.com",
      role: "owner",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    const domainId = await ctx.db.insert("whiteLabelPartnerDomains", {
      partnerId,
      hostname: "app.partner.com",
      cloudflareHostnameId: "cloudflare-hostname",
      status: "pending",
      setupState: "ownership_pending",
      createdAt: now,
      updatedAt: now,
    });
    return { domainId, partnerId };
  });

  return {
    client,
    domainId,
    partnerId,
    owner: client.withIdentity({
      subject: "partner-owner",
      email: "partner@example.com",
      orgId: "personal",
    }),
    other: client.withIdentity({
      subject: "other-user",
      email: "other@example.com",
      orgId: "personal",
    }),
  };
}

test("only the owning partner can start ownership polling", async () => {
  const fixture = await createFixture();

  await expect(
    fixture.other.mutation(
      api.whiteLabel.customHostnameData.confirmOwnershipDns,
      {},
    ),
  ).rejects.toThrow("Partner access");

  await fixture.owner.mutation(
    api.whiteLabel.customHostnameData.confirmOwnershipDns,
    {},
  );

  const domain = await fixture.client.run((ctx) => ctx.db.get(fixture.domainId));
  expect(domain).toMatchObject({
    setupState: "ownership_checking",
    pollGeneration: 1,
    pollAttempt: 0,
  });
});

test("does not allow cutover confirmation before certificate readiness", async () => {
  const fixture = await createFixture();

  await expect(
    fixture.owner.mutation(
      api.whiteLabel.customHostnameData.confirmCutoverDns,
      {},
    ),
  ).rejects.toThrow("certificate");
});

test("allows the owning partner to resume a stalled certificate check", async () => {
  const fixture = await createFixture();

  await fixture.client.run(async (ctx) => {
    await ctx.db.patch(fixture.domainId, {
      setupState: "certificate_checking",
      pollGeneration: 1,
      pollAttempt: 60,
    });
  });

  await fixture.owner.mutation(
    api.whiteLabel.customHostnameData.checkCertificateAgain,
    {},
  );

  const domain = await fixture.client.run((ctx) => ctx.db.get(fixture.domainId));
  expect(domain).toMatchObject({
    setupState: "certificate_checking",
    pollGeneration: 2,
    pollAttempt: 0,
  });
});

test("removes only the requested partner custom hostname during restart", async () => {
  const fixture = await createFixture();

  await fixture.client.mutation(
    internal.whiteLabel.customHostnameRestartData.removePartnerDomain,
    {
      partnerId: fixture.partnerId,
      domainId: fixture.domainId,
    },
  );

  const domain = await fixture.client.run((ctx) => ctx.db.get(fixture.domainId));
  expect(domain).toBeNull();
});
