/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import schema from "../schema";
import { dashboardOrigin } from "./dashboardOrigin";

const modules = import.meta.glob("/convex/**/*.ts");

afterEach(() => {
  vi.unstubAllEnvs();
});

test("uses a connected partner hostname for that workspace", async () => {
  vi.stubEnv("APP_BASE_URL", "https://app.kilobot.app");
  const t = convexTest(schema, modules);
  const origin = await t.run(async (ctx) => {
    const now = Date.now();
    const ownerId = await ctx.db.insert("users", {
      workosUserId: "escalation-owner",
      email: "owner@example.com",
      createdAt: now,
      updatedAt: now,
    });
    const partnerId = await ctx.db.insert("whiteLabelPartners", {
      name: "Go Solutions",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    const teamId = await ctx.db.insert("teams", {
      type: "organizational",
      name: "Go Solutions workspace",
      ownerId,
      workosOrgId: "go-solutions-org",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("whiteLabelPartnerOrganizations", {
      partnerId,
      teamId,
      status: "active",
      createdByUserId: ownerId,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("whiteLabelPartnerDomains", {
      partnerId,
      hostname: "chat.gosolutions.sg",
      status: "active",
      setupState: "connected",
      createdAt: now,
      updatedAt: now,
    });
    return await dashboardOrigin(ctx, "go-solutions-org");
  });

  expect(origin).toBe("https://chat.gosolutions.sg");
});

test("keeps the Kilobot app address when the workspace has no custom hostname", async () => {
  vi.stubEnv("APP_BASE_URL", "https://app.kilobot.app");
  const t = convexTest(schema, modules);
  const origin = await t.run(async (ctx) => await dashboardOrigin(ctx, "native-org"));
  expect(origin).toBe("https://app.kilobot.app");
});
