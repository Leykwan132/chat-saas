/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, expect, test, beforeAll, vi } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { withComponents } from "./testUtils";
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

afterEach(() => {
  vi.useRealTimers();
});

const stripeModules = {
  public: () => import("../node_modules/@convex-dev/stripe/dist/component/public.js"),
  private: () => import("../node_modules/@convex-dev/stripe/dist/component/private.js"),
  "_generated/server": () => import("../node_modules/@convex-dev/stripe/dist/component/_generated/server.js"),
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
  "_generated/server": () => import("../node_modules/@convex-dev/workpool/dist/component/_generated/server.js"),
};

const aggregateModules = {
  public: () => import("../node_modules/@convex-dev/aggregate/dist/component/public.js"),
  "_generated/server": () => import("../node_modules/@convex-dev/aggregate/dist/component/_generated/server.js"),
};

const agentModules = {
  apiKeys: () => import("../node_modules/@convex-dev/agent/dist/component/apiKeys.js"),
  files: () => import("../node_modules/@convex-dev/agent/dist/component/files.js"),
  messages: () => import("../node_modules/@convex-dev/agent/dist/component/messages.js"),
  streams: () => import("../node_modules/@convex-dev/agent/dist/component/streams.js"),
  threads: () => import("../node_modules/@convex-dev/agent/dist/component/threads.js"),
  users: () => import("../node_modules/@convex-dev/agent/dist/component/users.js"),
  "_generated/server": () => import("../node_modules/@convex-dev/agent/dist/component/_generated/server.js"),
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

async function createAgent(t: ReturnType<typeof initTest>, userId: string, name = "Site Agent") {
  return await t.run(async (ctx) => {
    const now = Date.now();
    return await ctx.db.insert("agents", {
      name,
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

test("ensureForAgent creates one connected web channel and widget settings", async () => {
  const t = initTest();
  const agentId = await createAgent(t, "user_web_setup", "Concierge");

  const first = await t
    .withIdentity({ subject: "user_web_setup", email: "web@example.com" })
    .mutation(api.webWidget.ensureForAgent, { agentId });
  const second = await t
    .withIdentity({ subject: "user_web_setup", email: "web@example.com" })
    .mutation(api.webWidget.ensureForAgent, { agentId });

  expect(second.channelId).toBe(first.channelId);
  expect(second.publicKey).toBe(first.publicKey);
  expect(first.agentDisplayName).toBe("Concierge");
  expect(first.canUseCustomIcon).toBe(false);

  const rows = await t.run(async (ctx) => {
    const channels = await ctx.db.query("channels").collect();
    const settings = await ctx.db.query("webWidgetSettings").collect();
    return { channels, settings };
  });

  expect(rows.channels).toHaveLength(1);
  expect(rows.channels[0]).toMatchObject({
    service: "web",
    status: "connected",
    defaultAgentId: agentId,
  });
  expect(rows.settings).toHaveLength(1);
  expect(rows.settings[0]).toMatchObject({
    channelId: first.channelId,
    agentId,
    publicKey: first.publicKey,
    enabled: true,
  });
});

test("public config resolves by widget key and rejects disabled widgets", async () => {
  const t = initTest();
  const agentId = await createAgent(t, "user_web_config");
  const setup = await t
    .withIdentity({ subject: "user_web_config", email: "config@example.com" })
    .mutation(api.webWidget.ensureForAgent, { agentId });

  const config = await t.query(api.webWidget.publicGetConfig, {
    publicKey: setup.publicKey,
  });

  expect(config).toMatchObject({
    publicKey: setup.publicKey,
    agentDisplayName: "Site Agent",
    poweredBy: true,
  });

  await t.run(async (ctx) => {
    const row = await ctx.db
      .query("webWidgetSettings")
      .withIndex("by_publicKey", (q) => q.eq("publicKey", setup.publicKey))
      .unique();
    if (row) {
      await ctx.db.patch(row._id, { enabled: false, updatedAt: Date.now() });
    }
  });

  await expect(
    t.query(api.webWidget.publicGetConfig, { publicKey: setup.publicKey }),
  ).rejects.toThrow("Widget not found");
});

test("web widget placement can change while theme stays fixed", async () => {
  const t = initTest();
  const agentId = await createAgent(t, "user_web_layout", "Layout Agent");
  const setup = await t
    .withIdentity({ subject: "user_web_layout", email: "layout@example.com" })
    .mutation(api.webWidget.ensureForAgent, { agentId });

  expect(setup.layout).toBe("input_bar");
  expect(setup.theme).toBe("light");

  await t
    .withIdentity({ subject: "user_web_layout", email: "layout@example.com" })
    .mutation(api.webWidget.updateSettings, {
      agentId,
      agentDisplayName: "Left Concierge",
      layout: "right_avatar",
      theme: "dark",
      placeholder: "Ask the concierge anything",
    });

  const updatedDashboard = await t
    .withIdentity({ subject: "user_web_layout", email: "layout@example.com" })
    .query(api.webWidget.getForAgent, { agentId });
  const updatedConfig = await t.query(api.webWidget.publicGetConfig, {
    publicKey: setup.publicKey,
  });

  expect(updatedDashboard).toMatchObject({
    agentDisplayName: "Left Concierge",
    layout: "right_avatar",
    theme: "light",
  });
  expect(updatedConfig).toMatchObject({
    agentDisplayName: "Left Concierge",
    layout: "right_avatar",
    theme: "light",
    placeholder: "Ask the concierge anything",
  });
  expect(updatedDashboard).not.toHaveProperty("launcherLabel");
  expect(updatedConfig).not.toHaveProperty("launcherLabel");
});

test("same visitor id reuses the web conversation", async () => {
  vi.useFakeTimers();
  const t = initTest();
  const agentId = await createAgent(t, "user_web_visitor");
  const setup = await t
    .withIdentity({ subject: "user_web_visitor", email: "visitor@example.com" })
    .mutation(api.webWidget.ensureForAgent, { agentId });

  const first = await t.mutation(internal.webWidget.internalReceiveMessage, {
    publicKey: setup.publicKey,
    visitorId: "visitor-1",
    content: "Hello",
    pageUrl: "https://example.com/",
  });
  const second = await t.mutation(internal.webWidget.internalReceiveMessage, {
    publicKey: setup.publicKey,
    visitorId: "visitor-1",
    content: "I need help",
    pageUrl: "https://example.com/pricing",
  });
  const other = await t.mutation(internal.webWidget.internalReceiveMessage, {
    publicKey: setup.publicKey,
    visitorId: "visitor-2",
    content: "Different visitor",
  });

  expect(second.conversationId).toBe(first.conversationId);
  expect(other.conversationId).not.toBe(first.conversationId);

  const state = await t.run(async (ctx) => {
    const conversations = await ctx.db.query("conversations").collect();
    const messages = await ctx.db.query("messages").collect();
    const analyticsRequests = await ctx.db
      .query("conversationAnalyticsDirtyRequests")
      .collect();
    return { conversations, messages, analyticsRequests };
  });
  const indicatorWork = await withComponents(t).runInComponent(
    "metaIndicatorWorkpool",
    async (ctx) => await ctx.db.query("work").collect(),
  );

  expect(state.conversations).toHaveLength(2);
  expect(state.conversations[0]).toMatchObject({
    service: "web",
    contactAddress: "visitor-1",
    assignedAgentId: agentId,
    assignToAiAgent: true,
  });
  expect(state.messages.filter((m) => m.conversationId === first.conversationId)).toHaveLength(2);
  expect(state.analyticsRequests).toHaveLength(2);
  expect(indicatorWork).toHaveLength(0);
});

test("web replies persist without requiring Meta channel send", async () => {
  const t = initTest();
  const agentId = await createAgent(t, "user_web_reply");
  const setup = await t
    .withIdentity({ subject: "user_web_reply", email: "reply@example.com" })
    .mutation(api.webWidget.ensureForAgent, { agentId });
  const received = await t.mutation(internal.webWidget.internalReceiveMessage, {
    publicKey: setup.publicKey,
    visitorId: "visitor-reply",
    content: "Can you reply here?",
  });

  const reply = await t
    .withIdentity({ subject: "user_web_reply", email: "reply@example.com" })
    .action(api.chat.inboxActions.sendReply, {
      conversationId: received.conversationId,
      content: "Yes, this stays in the web chat.",
    });

  expect(reply.agentMessageId).toBeTruthy();

  const messages = await t.query(api.webWidget.publicListMessages, {
    publicKey: setup.publicKey,
    visitorId: "visitor-reply",
  });

  expect(messages.map((message) => message.content)).toEqual([
    "Can you reply here?",
    "Yes, this stays in the web chat.",
  ]);

  const agentMessages = await withComponents(t).runInComponent("agent", async (ctx) => {
    return await ctx.db.query("messages").collect();
  });

  expect(agentMessages.some((message) => message.text === "Yes, this stays in the web chat.")).toBe(true);
});
