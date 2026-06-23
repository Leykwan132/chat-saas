/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import stripeSchema from "../node_modules/@convex-dev/stripe/dist/component/schema.js";
import aggregateSchema from "../node_modules/@convex-dev/aggregate/dist/component/schema.js";

const modules = import.meta.glob("./**/*.ts");

test("Backfill and Workspace/Account Usage Analytics Test", async () => {
  const t = convexTest(schema, modules);

  // Register Stripe component
  t.registerComponent("stripe", stripeSchema, {
    "public": () => import("../node_modules/@convex-dev/stripe/dist/component/public.js"),
    "private": () => import("../node_modules/@convex-dev/stripe/dist/component/private.js"),
    "_generated/server": () => import("../node_modules/@convex-dev/stripe/dist/component/_generated/server.js"),
  });

  // Register aggregate components used in the query
  const mockAggregate = {
    "public": () => import("../node_modules/@convex-dev/aggregate/dist/component/public.js"),
    "btree": () => import("../node_modules/@convex-dev/aggregate/dist/component/btree.js"),
    "compare": () => import("../node_modules/@convex-dev/aggregate/dist/component/compare.js"),
    "schema": () => import("../node_modules/@convex-dev/aggregate/dist/component/schema.js"),
    "_generated/server": () => import("../node_modules/@convex-dev/aggregate/dist/component/_generated/server.js"),
  };
  t.registerComponent("creditDailyUsage", aggregateSchema, mockAggregate);
  t.registerComponent("creditWorkspaceDailyUsage", aggregateSchema, mockAggregate);
  t.registerComponent("creditAccountDailyUsage", aggregateSchema, mockAggregate);

  const workosUserId = "user-123";

  // Mock an identity
  const testWithAuth = t.withIdentity({
    subject: workosUserId,
    orgId: "org-1",
    email: "test@example.com",
  });

  // Setup database records
  const { userDbId, teamId, agentId } = await t.run(async (ctx) => {
    const userDbId = await ctx.db.insert("users", {
      workosUserId,
      email: "test@example.com",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create personal team
    const personalTeamId = await ctx.db.insert("teams", {
      type: "personal",
      name: "Personal Workspace",
      ownerId: userDbId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await ctx.db.insert("teamMemberships", {
      teamId: personalTeamId,
      userId: userDbId,
      role: "owner",
      createdAt: Date.now(),
    });

    // Create organizational team
    const teamId = await ctx.db.insert("teams", {
      type: "organizational",
      name: "Shared Team",
      ownerId: userDbId,
      workosOrgId: "org-1",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await ctx.db.insert("teamMemberships", {
      teamId,
      userId: userDbId,
      role: "owner",
      createdAt: Date.now(),
    });

    await ctx.db.patch(userDbId, { activeTeamId: teamId });

    const agentId = await ctx.db.insert("agents", {
      name: "Test Agent",
      provider: "google",
      model: "gemini-2.5",
      systemPrompt: "System prompt",
      templateKey: "blank",
      fileSize: 0,
      userId: workosUserId,
      orgId: "org-1",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const creditLogId = await ctx.db.insert("creditLogs", {
      orgId: "org-1",
      userId: userDbId,
      type: "deduction",
      eventType: "usage",
      label: "Usage",
      amount: -100,
      balanceBefore: 1000,
      balanceAfter: 900,
      createdAt: Date.now(),
    });

    // Insert a creditUsageEvent without orgId to test backfill
    await ctx.db.insert("creditUsageEvents", {
      userId: userDbId,
      agentId,
      modelId: "gemini-2.5",
      credits: 100,
      creditLogId,
      createdAt: Date.now(),
    } as any);

    return { userDbId, teamId, agentId };
  });

  // 1. Verify before backfill orgId is undefined
  const eventBefore = await t.run(async (ctx) => {
    return await ctx.db.query("creditUsageEvents").first();
  });
  expect(eventBefore?.orgId).toBeUndefined();

  // 2. Run the backfill mutation
  const backfillResult = await t.mutation(internal.backfillEvents.backfillExistingEventsOrgId, {});
  expect(backfillResult.updated).toBe(1);

  // 3. Verify after backfill orgId is "org-1"
  const eventAfter = await t.run(async (ctx) => {
    return await ctx.db.query("creditUsageEvents").first();
  });
  expect(eventAfter?.orgId).toBe("org-1");

  // 4. Run getWorkspaceAndAccountUsage query
  const usageResult = await testWithAuth.query(api.creditUsageAnalytics.getWorkspaceAndAccountUsage, {});
  expect(usageResult).toBeDefined();
  expect(usageResult?.workspaceName).toBe("Shared Team");

  // 5. Test getWorkspaceCreditUsage
  const workspaceUsageResult = await testWithAuth.query(api.creditUsageAnalytics.getWorkspaceCreditUsage, {
    workspaceId: "org-1",
    timeRange: "period",
  });
  expect(workspaceUsageResult).toBeDefined();
  expect(workspaceUsageResult?.totalCreditsUsed).toBe(100);
  expect(workspaceUsageResult?.modelUsage.series.length).toBe(1);
  expect(workspaceUsageResult?.modelUsage.series[0].label).toBe("Test Agent");

  // 6. Test getAccountCreditUsage
  const accountUsageResult = await testWithAuth.query(api.creditUsageAnalytics.getAccountCreditUsage, {
    timeRange: "period",
  });
  expect(accountUsageResult).toBeDefined();
  expect(accountUsageResult?.totalCreditsUsed).toBe(100);
  expect(accountUsageResult?.modelUsage.series.length).toBe(1);
  expect(accountUsageResult?.modelUsage.series[0].label).toBe("Shared Team");

  // 7. Test getWorkspaceCreditSpendHistory
  const workspaceHistory = await testWithAuth.query(api.creditUsageAnalytics.getWorkspaceCreditSpendHistory, {
    workspaceId: "org-1",
    timeRange: "period",
    paginationOpts: { numItems: 10, cursor: null },
  });
  expect(workspaceHistory).toBeDefined();
  expect(workspaceHistory.page.length).toBe(1);
  expect(workspaceHistory.page[0].credits).toBe(100);
  expect(workspaceHistory.page[0].agentName).toBe("Test Agent");

  // 8. Test getAccountCreditSpendHistory
  const accountHistory = await testWithAuth.query(api.creditUsageAnalytics.getAccountCreditSpendHistory, {
    timeRange: "period",
    paginationOpts: { numItems: 10, cursor: null },
  });
  expect(accountHistory).toBeDefined();
  expect(accountHistory.page.length).toBe(1);
  expect(accountHistory.page[0].credits).toBe(100);
  expect(accountHistory.page[0].agentName).toBe("Test Agent");
});
