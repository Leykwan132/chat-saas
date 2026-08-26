import type { TestConvex } from "convex-test";
import type { Id } from "./_generated/dataModel";
import { components } from "./_generated/api";
import schema from "./schema";
import aggregateSchema from "../node_modules/@convex-dev/aggregate/dist/component/schema.js";
import stripeSchema from "../node_modules/@convex-dev/stripe/dist/component/schema.js";

type AppTestConvex = TestConvex<typeof schema>;

const aggregateModules = {
  "public": () => import("../node_modules/@convex-dev/aggregate/dist/component/public.js"),
  "btree": () => import("../node_modules/@convex-dev/aggregate/dist/component/btree.js"),
  "compare": () => import("../node_modules/@convex-dev/aggregate/dist/component/compare.js"),
  "schema": () => import("../node_modules/@convex-dev/aggregate/dist/component/schema.js"),
  "_generated/server": () =>
    import("../node_modules/@convex-dev/aggregate/dist/component/_generated/server.js"),
};

const stripeModules = {
  public: () => import("../node_modules/@convex-dev/stripe/dist/component/public.js"),
  private: () => import("../node_modules/@convex-dev/stripe/dist/component/private.js"),
  "_generated/server": () =>
    import("../node_modules/@convex-dev/stripe/dist/component/_generated/server.js"),
};

export function registerAgentOverviewAggregateComponents(t: AppTestConvex) {
  t.registerComponent("stripe", stripeSchema, stripeModules);
  t.registerComponent(
    "agentOverviewAiAssistedDaily",
    aggregateSchema,
    aggregateModules,
  );
  t.registerComponent(
    "agentOverviewHumanEscalationsDaily",
    aggregateSchema,
    aggregateModules,
  );
}

export async function createAgentOverviewFixture(
  t: AppTestConvex,
  workosUserId = "overview-owner",
) {
  const ids = await t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      workosUserId,
      email: `${workosUserId}@example.com`,
      createdAt: now,
      updatedAt: now,
    });
    const teamId = await ctx.db.insert("teams", {
      type: "personal",
      name: "Personal",
      ownerId: userId,
      timeZone: "UTC",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("teamMemberships", {
      teamId,
      userId,
      role: "owner",
      createdAt: now,
    });
    await ctx.db.patch(userId, { activeTeamId: teamId, updatedAt: now });
    const agentId = await ctx.db.insert("agents", {
      name: "Overview Agent",
      provider: "openrouter",
      model: "deepseek/deepseek-v4-flash",
      systemPrompt: "Test",
      templateKey: "blank",
      fileSize: 0,
      userId: workosUserId,
      orgId: "",
      createdAt: now,
      updatedAt: now,
    });
    return { agentId, teamId, userId, now };
  });

  return {
    ...ids,
    authed: t.withIdentity({ subject: workosUserId }),
  };
}

export async function enableAgentOverviewTopicAnalytics(
  t: AppTestConvex,
  workosUserId = "overview-owner",
) {
  await t.mutation(components.stripe.private.handleSubscriptionCreated, {
    stripeSubscriptionId: `sub-${workosUserId}`,
    stripeCustomerId: `cus-${workosUserId}`,
    status: "active",
    currentPeriodEnd: Math.floor(Date.now() / 1000) + 86_400,
    cancelAtPeriodEnd: false,
    priceId: process.env.STRIPE_PRICE_GROWTH_MONTHLY!,
    metadata: { orgId: workosUserId },
  });
}

export async function insertAgentOverviewConversation(
  t: AppTestConvex,
  args: { agentId: Id<"agents">; workosUserId?: string; now: number },
) {
  return await t.run(async (ctx) =>
    ctx.db.insert("conversations", {
      orgId: "",
      userId: args.workosUserId ?? "overview-owner",
      service: "whatsapp",
      orgAddress: "business",
      contactAddress: "+60123456789",
      contactName: "Customer",
      status: "open",
      assignedAgentId: args.agentId,
      assignToAiAgent: true,
      threadId: `thread-${args.now}`,
      lastMessageAt: args.now,
      unreadCount: 0,
      createdAt: args.now,
      updatedAt: args.now,
    }),
  );
}
