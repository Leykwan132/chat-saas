/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";
import aggregateSchema from "../node_modules/@convex-dev/aggregate/dist/component/schema.js";

const modules = import.meta.glob("./**/*.ts");
const aggregateModules = {
  public: () => import("../node_modules/@convex-dev/aggregate/dist/component/public.js"),
  btree: () => import("../node_modules/@convex-dev/aggregate/dist/component/btree.js"),
  compare: () => import("../node_modules/@convex-dev/aggregate/dist/component/compare.js"),
  schema: () => import("../node_modules/@convex-dev/aggregate/dist/component/schema.js"),
  "_generated/server": () =>
    import("../node_modules/@convex-dev/aggregate/dist/component/_generated/server.js"),
};

function initTest() {
  const t = convexTest(schema, modules);
  t.registerComponent("modelLifetimeUsage", aggregateSchema, aggregateModules);
  t.registerComponent("modelMonthlyUsage", aggregateSchema, aggregateModules);
  t.registerComponent("agentMonthlyUsage", aggregateSchema, aggregateModules);
  t.registerComponent("agentCostUsage", aggregateSchema, aggregateModules);
  return t;
}

test("insertRawUsage stores the agent WorkOS user ID instead of runtime org IDs", async () => {
  const t = initTest();
  const now = Date.UTC(2026, 6, 6);
  const workosUserId = "user_agent_owner";
  const threadId = "thread-workos-user-usage";

  const agentId = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      workosUserId,
      email: "owner@example.com",
      createdAt: now,
      updatedAt: now,
    });
    const teamId = await ctx.db.insert("teams", {
      type: "personal",
      name: "Personal",
      ownerId: userId,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(userId, { activeTeamId: teamId, updatedAt: now });
    const agentId = await ctx.db.insert("agents", {
      name: "Usage Agent",
      provider: "openrouter",
      model: "openai/gpt-oss-120b",
      systemPrompt: "Test",
      templateKey: "blank",
      fileSize: 0,
      userId: workosUserId,
      orgId: "",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("conversations", {
      orgId: "",
      userId: workosUserId,
      service: "web",
      orgAddress: "business",
      contactAddress: "visitor",
      status: "open",
      assignedAgentId: agentId,
      assignToAiAgent: true,
      threadId,
      lastMessageAt: now,
      unreadCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    return agentId;
  });

  await t.mutation(internal.agentUsage.insertRawUsage, {
    userId: "org:",
    threadId,
    agentId,
    model: "openai/gpt-oss-120b",
    provider: "openrouter",
    usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
  });

  const usageRow = await t.run(async (ctx) => {
    return await ctx.db.query("rawAgentUsage").order("desc").first();
  });

  expect(usageRow?.userId).toBe(workosUserId);
});
