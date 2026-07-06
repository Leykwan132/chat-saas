/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { beforeAll, expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import agentSchema from "../node_modules/@convex-dev/agent/dist/component/schema.js";
import aggregateSchema from "../node_modules/@convex-dev/aggregate/dist/component/schema.js";
import stripeSchema from "../node_modules/@convex-dev/stripe/dist/component/schema.js";
import workpoolSchema from "../node_modules/@convex-dev/workpool/dist/component/schema.js";

const modules = import.meta.glob("./**/*.ts");

beforeAll(() => {
  process.env.STRIPE_PRICE_STARTER_MONTHLY = "price_starter_monthly";
  process.env.STRIPE_PRICE_STARTER_ANNUAL = "price_starter_annual";
  process.env.STRIPE_PRICE_GROWTH_MONTHLY = "price_growth_monthly";
  process.env.STRIPE_PRICE_GROWTH_ANNUAL = "price_growth_annual";
  process.env.STRIPE_PRICE_BUSINESS_MONTHLY = "price_business_monthly";
  process.env.STRIPE_PRICE_BUSINESS_ANNUAL = "price_business_annual";
  process.env.STRIPE_PRICE_EXTRA_CREDITS_2000 = "price_extra_credits_2000";
  process.env.STRIPE_PRICE_EXTRA_CREDITS_5000 = "price_extra_credits_5000";
  process.env.STRIPE_PRICE_EXTRA_CREDITS_15000 = "price_extra_credits_15000";
});

const stripeModules = {
  public: () => import("../node_modules/@convex-dev/stripe/dist/component/public.js"),
  private: () => import("../node_modules/@convex-dev/stripe/dist/component/private.js"),
  "_generated/server": () =>
    import("../node_modules/@convex-dev/stripe/dist/component/_generated/server.js"),
};

const workpoolModules = {
  complete: () => import("../node_modules/@convex-dev/workpool/dist/component/complete.js"),
  config: () => import("../node_modules/@convex-dev/workpool/dist/component/config.js"),
  crons: () => import("../node_modules/@convex-dev/workpool/dist/component/crons.js"),
  danger: () => import("../node_modules/@convex-dev/workpool/dist/component/danger.js"),
  kick: () => import("../node_modules/@convex-dev/workpool/dist/component/kick.js"),
  lib: () => import("../node_modules/@convex-dev/workpool/dist/component/lib.js"),
  logging: () => import("../node_modules/@convex-dev/workpool/dist/component/logging.js"),
  loop: () => import("../node_modules/@convex-dev/workpool/dist/component/loop.js"),
  recovery: () => import("../node_modules/@convex-dev/workpool/dist/component/recovery.js"),
  stats: () => import("../node_modules/@convex-dev/workpool/dist/component/stats.js"),
  worker: () => import("../node_modules/@convex-dev/workpool/dist/component/worker.js"),
  "_generated/server": () =>
    import("../node_modules/@convex-dev/workpool/dist/component/_generated/server.js"),
};

const aggregateModules = {
  public: () => import("../node_modules/@convex-dev/aggregate/dist/component/public.js"),
  "_generated/server": () =>
    import("../node_modules/@convex-dev/aggregate/dist/component/_generated/server.js"),
};

const agentModules = {
  apiKeys: () => import("../node_modules/@convex-dev/agent/dist/component/apiKeys.js"),
  files: () => import("../node_modules/@convex-dev/agent/dist/component/files.js"),
  messages: () => import("../node_modules/@convex-dev/agent/dist/component/messages.js"),
  streams: () => import("../node_modules/@convex-dev/agent/dist/component/streams.js"),
  threads: () => import("../node_modules/@convex-dev/agent/dist/component/threads.js"),
  users: () => import("../node_modules/@convex-dev/agent/dist/component/users.js"),
  "_generated/server": () =>
    import("../node_modules/@convex-dev/agent/dist/component/_generated/server.js"),
};

function initTest() {
  const t = convexTest(schema, modules);
  t.registerComponent("stripe", stripeSchema, stripeModules);
  t.registerComponent("agent", agentSchema, agentModules);
  t.registerComponent("inboxAiReplyWorkpool", workpoolSchema, workpoolModules);
  t.registerComponent("metaIndicatorWorkpool", workpoolSchema, workpoolModules);
  t.registerComponent("threadSummarizerWorkpool", workpoolSchema, workpoolModules);
  t.registerComponent("conversationLogWorkpool", workpoolSchema, workpoolModules);
  t.registerComponent("analyticsMetrics", aggregateSchema, aggregateModules);
  t.registerComponent("modelLifetimeUsage", aggregateSchema, aggregateModules);
  t.registerComponent("modelMonthlyUsage", aggregateSchema, aggregateModules);
  t.registerComponent("agentMonthlyUsage", aggregateSchema, aggregateModules);
  t.registerComponent("agentCostUsage", aggregateSchema, aggregateModules);
  return t;
}

async function createAgent(t: ReturnType<typeof initTest>, userId: string) {
  return await t.run(async (ctx) => {
    const now = Date.now();
    return await ctx.db.insert("agents", {
      name: "Default Website Agent",
      provider: "openrouter",
      model: "deepseek/deepseek-v4-flash",
      systemPrompt: "Answer website visitors.",
      templateKey: "blank",
      fileSize: 0,
      userId,
      orgId: "",
      createdAt: now,
      updatedAt: now,
    });
  });
}

test("website setup does not consume external channel capacity", async () => {
  const t = initTest();
  const userId = "user_web_default_capacity";
  const identity = { subject: userId, email: "default-web@example.com" };
  const agentId = await createAgent(t, userId);

  await t.withIdentity(identity).mutation(api.webWidget.ensureForAgent, { agentId });
  const instagramId = await t.mutation(internal.channels.internalStartInstagramPending, {
    orgId: "",
    connectedByUserId: userId,
    igUserId: "ig_default_web_capacity",
  });

  expect(instagramId).toBeTruthy();

  const channels = await t.run(async (ctx) => {
    return await ctx.db.query("channels").collect();
  });

  expect(channels.map((channel) => channel.service).sort()).toEqual([
    "instagram",
    "web",
  ]);
});

test("website setup still works after the external channel slot is used", async () => {
  const t = initTest();
  const userId = "user_external_first_capacity";
  const identity = { subject: userId, email: "external-first@example.com" };
  const agentId = await createAgent(t, userId);

  await t.mutation(internal.channels.internalStartInstagramPending, {
    orgId: "",
    connectedByUserId: userId,
    igUserId: "ig_external_first_capacity",
  });
  const setup = await t
    .withIdentity(identity)
    .mutation(api.webWidget.ensureForAgent, { agentId });

  expect(setup.publicKey).toMatch(/^pub_/);
});

test("public website preview receive stores a real agent conversation", async () => {
  const t = initTest();
  const userId = "user_web_preview_receive";
  const identity = { subject: userId, email: "preview-receive@example.com" };
  const agentId = await createAgent(t, userId);
  const setup = await t
    .withIdentity(identity)
    .mutation(api.webWidget.ensureForAgent, { agentId });
  const visitorId = "dashboard-preview-visitor";

  const received = await t.mutation(api.webWidget.publicReceiveMessage, {
    publicKey: setup.publicKey,
    visitorId,
    content: "Does the preview use the real backend?",
    pageUrl: "http://localhost/dashboard/channels",
  });
  const messages = await t.query(api.webWidget.publicListMessages, {
    publicKey: setup.publicKey,
    visitorId,
  });
  const conversation = await t.run(async (ctx) => {
    return await ctx.db.get(received.conversationId);
  });

  expect(messages).toHaveLength(1);
  expect(messages[0]).toMatchObject({
    direction: "incoming",
    content: "Does the preview use the real backend?",
    contentType: "text",
  });
  expect(conversation).toMatchObject({
    service: "web",
    assignedAgentId: agentId,
    assignToAiAgent: true,
  });
});
