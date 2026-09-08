/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { beforeEach, expect, test } from "vitest";
import stripeSchema from "../node_modules/@convex-dev/stripe/dist/component/schema.js";
import workpoolSchema from "../node_modules/@convex-dev/workpool/dist/component/schema.js";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const hostname = "chat.partner.example";
const issuer = "https://test.convex.site/partner-auth";
const stripeModules = {
  public: () => import("../node_modules/@convex-dev/stripe/dist/component/public.js"),
  private: () => import("../node_modules/@convex-dev/stripe/dist/component/private.js"),
  "_generated/server": () =>
    import("../node_modules/@convex-dev/stripe/dist/component/_generated/server.js"),
};
const workpoolModules = {
  complete: () =>
    import("../node_modules/@convex-dev/workpool/dist/component/complete.js"),
  config: () =>
    import("../node_modules/@convex-dev/workpool/dist/component/config.js"),
  crons: () =>
    import("../node_modules/@convex-dev/workpool/dist/component/crons.js"),
  danger: () =>
    import("../node_modules/@convex-dev/workpool/dist/component/danger.js"),
  kick: () =>
    import("../node_modules/@convex-dev/workpool/dist/component/kick.js"),
  lib: () => import("../node_modules/@convex-dev/workpool/dist/component/lib.js"),
  logging: () =>
    import("../node_modules/@convex-dev/workpool/dist/component/logging.js"),
  loop: () =>
    import("../node_modules/@convex-dev/workpool/dist/component/loop.js"),
  recovery: () =>
    import("../node_modules/@convex-dev/workpool/dist/component/recovery.js"),
  stats: () =>
    import("../node_modules/@convex-dev/workpool/dist/component/stats.js"),
  worker: () =>
    import("../node_modules/@convex-dev/workpool/dist/component/worker.js"),
  "_generated/server": () =>
    import("../node_modules/@convex-dev/workpool/dist/component/_generated/server.js"),
};

beforeEach(() => {
  process.env.CONVEX_SITE_URL = "https://test.convex.site";
});

function initTest() {
  const t = convexTest(schema, modules);
  t.registerComponent("stripe", stripeSchema, stripeModules);
  t.registerComponent("creditPeriodWorkpool", workpoolSchema, workpoolModules);
  return t;
}

async function seedPartnerOnlyCustomer(t: ReturnType<typeof initTest>) {
  return await t.run(async (ctx) => {
    const now = Date.now();
    const workosUserId = "partner-only-customer";
    const userId = await ctx.db.insert("users", {
      workosUserId,
      email: "customer@partner.test",
      onboarded: true,
      createdAt: now,
      updatedAt: now,
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
    await ctx.db.patch(userId, { activeTeamId: teamId });
    return { workosUserId, userId, partnerId, partnerOrganizationId };
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

test("native Kilobot does not crash a partner-only user missing a personal team", async () => {
  const t = initTest();
  const seeded = await seedPartnerOnlyCustomer(t);
  const native = t.withIdentity({
    subject: seeded.workosUserId,
    email: "customer@partner.test",
  });

  const currentUser = await native.query(api.users.currentUser, {});
  expect(currentUser?.onboarded).toBe(true);
  expect(currentUser?.isPartnerManaged).toBe(false);
  expect(currentUser?.needsPersonalWorkspace).toBe(true);
  expect(currentUser?.onboardingAnswers).toBeUndefined();

  await expect(native.query(api.plans.getPlanAndUsage, {})).resolves.toBeNull();

  await native.mutation(api.users.ensureCurrentUser, {});
  const provisioned = await native.query(api.users.currentUser, {});
  expect(provisioned?.needsPersonalWorkspace).toBe(false);

  const usage = await native.query(api.plans.getPlanAndUsage, {});
  expect(usage?.plan).toBe("free");
  expect(usage?.isTeam).toBe(false);
});

test("partner sessions keep the organization wallet without a personal team", async () => {
  const t = initTest();
  const seeded = await seedPartnerOnlyCustomer(t);
  const partner = t.withIdentity(
    partnerIdentity(
      seeded.workosUserId,
      seeded.partnerId,
      seeded.partnerOrganizationId,
    ),
  );

  const currentUser = await partner.query(api.users.currentUser, {});
  expect(currentUser?.isPartnerManaged).toBe(true);
  expect(currentUser?.needsPersonalWorkspace).toBe(false);
  expect(currentUser?.plan).toBe("growth");

  const usage = await partner.query(api.plans.getPlanAndUsage, {});
  expect(usage?.plan).toBe("growth");
  expect(usage?.isTeam).toBe(true);
});

test("Kilobot onboarding records answers even when partner already onboarded the user", async () => {
  const t = initTest();
  const seeded = await seedPartnerOnlyCustomer(t);
  const native = t.withIdentity({
    subject: seeded.workosUserId,
    email: "customer@partner.test",
  });
  await native.mutation(api.users.ensureCurrentUser, {});
  await native.mutation(api.users.completeOnboarding, {
    role: "founder",
    useCase: ["support"],
    channels: ["whatsapp"],
  });
  const currentUser = await native.query(api.users.currentUser, {});
  expect(currentUser?.onboardingAnswers).toEqual({
    role: "founder",
    useCase: ["support"],
    channels: ["whatsapp"],
  });
});
