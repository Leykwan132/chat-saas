/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { withComponents } from "./testUtils";
import stripeSchema from "../node_modules/@convex-dev/stripe/dist/component/schema.js";

const modules = import.meta.glob("./**/*.ts");
const stripeModules = {
  public: () => import("../node_modules/@convex-dev/stripe/dist/component/public.js"),
  private: () => import("../node_modules/@convex-dev/stripe/dist/component/private.js"),
  "_generated/server": () => import("../node_modules/@convex-dev/stripe/dist/component/_generated/server.js"),
};

test("admin usage cost report groups OpenRouter cost by user and model", async () => {
  const t = convexTest(schema, modules);
  t.registerComponent("stripe", stripeSchema, stripeModules);
  const sessionToken = "admin-session-token";
  const baseTime = Date.UTC(2023, 10, 14, 0, 0, 0);
  const decemberTime = Date.UTC(2023, 11, 5, 0, 0, 0);

  await t.run(async (ctx) => {
    await ctx.db.insert("adminSessions", {
      token: sessionToken,
      email: "admin@example.com",
      expiresAt: Date.now() + 86_400_000,
      createdAt: baseTime,
    });

    await ctx.db.insert("users", {
      workosUserId: "user_growth",
      email: "growth@example.com",
      stripeSubscriptionId: "sub_growth",
      createdAt: baseTime,
      updatedAt: baseTime,
    });

    await ctx.db.insert("users", {
      workosUserId: "user_free",
      email: "free@example.com",
      createdAt: baseTime,
      updatedAt: baseTime,
    });

    const growthAgentId = await ctx.db.insert("agents", {
      name: "Growth Agent",
      provider: "openrouter",
      model: "openai/gpt-oss-120b",
      systemPrompt: "Test",
      templateKey: "blank",
      fileSize: 0,
      userId: "user_growth",
      orgId: "",
      createdAt: baseTime,
      updatedAt: baseTime,
    });

    await ctx.db.insert("rawAgentUsage", {
      userId: "org:",
      threadId: "thread-1",
      agentId: growthAgentId,
      model: "openai/gpt-oss-120b",
      provider: "openrouter",
      usage: { promptTokens: 100, completionTokens: 20, totalTokens: 120 },
      providerMetadata: { openrouter: { usage: { cost: 0.3 } } },
      createdAt: baseTime + 1_000,
    });

    await ctx.db.insert("rawAgentUsage", {
      userId: "user_growth",
      threadId: "thread-2",
      model: "openai/gpt-oss-120b",
      provider: "openrouter",
      usage: { promptTokens: 90, completionTokens: 10, totalTokens: 100 },
      providerMetadata: { openrouter: { usage: { cost: 0.2 } } },
      createdAt: baseTime + 2_000,
    });

    await ctx.db.insert("rawAgentUsage", {
      userId: "user_growth",
      threadId: "thread-3",
      model: "z-ai/glm-4.5-air",
      provider: "openrouter",
      usage: { promptTokens: 50, completionTokens: 10, totalTokens: 60 },
      providerMetadata: { openrouter: { usage: { cost: 0.1 } } },
      createdAt: decemberTime + 1_000,
    });

    await ctx.db.insert("rawAgentUsage", {
      userId: "user_free",
      threadId: "thread-4",
      model: "openai/gpt-oss-120b",
      provider: "openrouter",
      usage: { promptTokens: 70, completionTokens: 30, totalTokens: 100 },
      providerMetadata: { openrouter: { usage: { cost: 0.4 } } },
      createdAt: decemberTime + 2_000,
    });

    await ctx.db.insert("rawAgentUsage", {
      userId: "user_free",
      threadId: "thread-5",
      model: "ignored/no-cost",
      provider: "openrouter",
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      providerMetadata: { openrouter: { usage: {} } },
      createdAt: decemberTime + 3_000,
    });
  });

  await withComponents(t).runInComponent("stripe", async (ctx) => {
    await ctx.db.insert("subscriptions", {
      stripeSubscriptionId: "sub_growth",
      stripeCustomerId: "cus_growth",
      status: "active",
      currentPeriodEnd: Math.floor(baseTime / 1000) + 2_592_000,
      cancelAtPeriodEnd: false,
      priceId: "mock_pro_mo",
    });
  });

  const report = await t.query(api.adminUsageCosts.getAdminUsageCostReport, {
    sessionToken,
  });

  expect(report.userRows).toMatchObject([
    {
      userId: "user_growth",
      email: "growth@example.com",
      planKey: "growth",
      planName: "Growth",
      requestCount: 3,
      totalTokens: 280,
      totalCostUsd: 0.6,
      averageCostUsd: 0.2,
      topModel: "openai/gpt-oss-120b",
      lastRequestAt: decemberTime + 1_000,
    },
    {
      userId: "user_free",
      email: "free@example.com",
      planKey: "free",
      planName: "Free",
      requestCount: 1,
      totalTokens: 100,
      totalCostUsd: 0.4,
      averageCostUsd: 0.4,
      topModel: "openai/gpt-oss-120b",
      lastRequestAt: decemberTime + 2_000,
    },
  ]);

  expect(report.modelRows).toMatchObject([
    {
      userId: "user_growth",
      model: "openai/gpt-oss-120b",
      requestCount: 2,
      totalTokens: 220,
      totalCostUsd: 0.5,
      averageCostUsd: 0.25,
    },
    {
      userId: "user_free",
      model: "openai/gpt-oss-120b",
      requestCount: 1,
      totalTokens: 100,
      totalCostUsd: 0.4,
      averageCostUsd: 0.4,
    },
    {
      userId: "user_growth",
      model: "z-ai/glm-4.5-air",
      requestCount: 1,
      totalTokens: 60,
      totalCostUsd: 0.1,
      averageCostUsd: 0.1,
    },
  ]);

  expect(report.sourceRowCount).toBe(5);
  expect(report.costedRequestCount).toBe(4);
  expect(report.monthOptions).toMatchObject([
    {
      monthKey: "2023-12",
      label: "Dec 2023",
      requestCount: 2,
      totalTokens: 160,
      totalCostUsd: 0.5,
    },
    {
      monthKey: "2023-11",
      label: "Nov 2023",
      requestCount: 2,
      totalTokens: 220,
      totalCostUsd: 0.5,
    },
  ]);
  expect(report.monthlyUserRows).toMatchObject([
    {
      monthKey: "2023-12",
      userId: "user_free",
      totalCostUsd: 0.4,
      requestCount: 1,
    },
    {
      monthKey: "2023-12",
      userId: "user_growth",
      totalCostUsd: 0.1,
      requestCount: 1,
    },
    {
      monthKey: "2023-11",
      userId: "user_growth",
      totalCostUsd: 0.5,
      requestCount: 2,
    },
  ]);
  expect(report.monthlyModelRows).toMatchObject([
    {
      monthKey: "2023-12",
      userId: "user_free",
      model: "openai/gpt-oss-120b",
      totalCostUsd: 0.4,
    },
    {
      monthKey: "2023-12",
      userId: "user_growth",
      model: "z-ai/glm-4.5-air",
      totalCostUsd: 0.1,
    },
    {
      monthKey: "2023-11",
      userId: "user_growth",
      model: "openai/gpt-oss-120b",
      totalCostUsd: 0.5,
    },
  ]);
});
