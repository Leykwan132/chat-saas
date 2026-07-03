/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test, vi, beforeAll } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import workpoolSchema from "../node_modules/@convex-dev/workpool/dist/component/schema.js";
import agentSchema from "../node_modules/@convex-dev/agent/dist/component/schema.js";
import stripeSchema from "../node_modules/@convex-dev/stripe/dist/component/schema.js";
import aggregateSchema from "../node_modules/@convex-dev/aggregate/dist/component/schema.js";

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

const modules = import.meta.glob("./**/*.ts");

test("Sender name resolution for channel, human, and AI providers", async () => {
  const t = convexTest(schema, modules);

  // Register Stripe component
  t.registerComponent("stripe", stripeSchema, {
    "public": () => import("../node_modules/@convex-dev/stripe/dist/component/public.js"),
    "private": () => import("../node_modules/@convex-dev/stripe/dist/component/private.js"),
    "_generated/server": () => import("../node_modules/@convex-dev/stripe/dist/component/_generated/server.js"),
  });

  // Register workpools
  const mockWorkpool = {
    "complete": () => import("../node_modules/@convex-dev/workpool/dist/component/complete.js"),
    "config": () => import("../node_modules/@convex-dev/workpool/dist/component/config.js"),
    "crons": () => import("../node_modules/@convex-dev/workpool/dist/component/crons.js"),
    "danger": () => import("../node_modules/@convex-dev/workpool/dist/component/danger.js"),
    "kick": () => import("../node_modules/@convex-dev/workpool/dist/component/kick.js"),
    "lib": () => import("../node_modules/@convex-dev/workpool/dist/component/lib.js"),
    "logging": () => import("../node_modules/@convex-dev/workpool/dist/component/logging.js"),
    "loop": () => import("../node_modules/@convex-dev/workpool/dist/component/loop.js"),
    "recovery": () => import("../node_modules/@convex-dev/workpool/dist/component/recovery.js"),
    "stats": () => import("../node_modules/@convex-dev/workpool/dist/component/stats.js"),
    "worker": () => import("../node_modules/@convex-dev/workpool/dist/component/worker.js"),
    "_generated/server": () => import("../node_modules/@convex-dev/workpool/dist/component/_generated/server.js"),
  };
  t.registerComponent("inboxAiReplyWorkpool", workpoolSchema, mockWorkpool);
  t.registerComponent("threadSummarizerWorkpool", workpoolSchema, mockWorkpool);
  t.registerComponent("conversationLogWorkpool", workpoolSchema, mockWorkpool);

  const mockAggregate = {
    "public": () => import("../node_modules/@convex-dev/aggregate/dist/component/public.js"),
    "_generated/server": () => import("../node_modules/@convex-dev/aggregate/dist/component/_generated/server.js"),
  };
  t.registerComponent("analyticsMetrics", aggregateSchema, mockAggregate);

  // Register the agent component
  t.registerComponent("agent", agentSchema, {
    "apiKeys": () => import("../node_modules/@convex-dev/agent/dist/component/apiKeys.js"),
    "files": () => import("../node_modules/@convex-dev/agent/dist/component/files.js"),
    "messages": () => import("../node_modules/@convex-dev/agent/dist/component/messages.js"),
    "streams": () => import("../node_modules/@convex-dev/agent/dist/component/streams.js"),
    "threads": () => import("../node_modules/@convex-dev/agent/dist/component/threads.js"),
    "users": () => import("../node_modules/@convex-dev/agent/dist/component/users.js"),
    "_generated/server": () => import("../node_modules/@convex-dev/agent/dist/component/_generated/server.js"),
  });

  // Setup mock User (human team member)
  const humanWorkosUserId = "workos-user-jane";
  await t.run(async (ctx) => {
    const { ensureUserAccount } = await import("./teamHelpers");
    await ensureUserAccount(ctx, {
      workosUserId: humanWorkosUserId,
      email: "jane.doe@example.com",
      firstName: "Jane",
      lastName: "Doe",
    });
  });

  // Setup mock Agent
  const agentId = await t.run(async (ctx) => {
    return await ctx.db.insert("agents", {
      name: "Support Bot (Alex)",
      provider: "openrouter",
      model: "deepseek/deepseek-v4-flash",
      systemPrompt: "You are a support agent.",
      templateKey: "blank",
      fileSize: 0,
      userId: humanWorkosUserId,
      orgId: "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });

  // Setup mock Channel
  const channelId = await t.run(async (ctx) => {
    return await ctx.db.insert("channels", {
      orgId: "",
      service: "whatsapp",
      phoneNumberId: "phone-id-123",
      displayPhoneNumber: "+15551234567",
      accessToken: "token-123",
      status: "connected",
      connectedByUserId: humanWorkosUserId,
      defaultAgentId: agentId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });

  // Ingest an incoming message to start the conversation and thread
  const result = await t.mutation(internal.chat.inbox.internalIngestChannelMessage, {
    channelId,
    externalId: "incoming-ext-1",
    contactAddress: "+60123456789",
    contactName: "Customer John",
    direction: "incoming",
    content: "Hi, I need help",
    contentType: "text",
    timestampMs: Date.now(),
    isHistorical: true,
  });

  // Verify conversation is set up correctly
  const conversation = await t.run(async (ctx) => {
    return await ctx.db.get(result.conversationId);
  });
  expect(conversation).not.toBeNull();

  // Act: Save three different outgoing replies to the thread
  // 1. Synced historical/channel reply
  await t.run(async (ctx) => {
    const { saveHumanReply } = await import("./chat/threads");
    await saveHumanReply(ctx, conversation!.threadId, "Hello, this is a historical channel reply.", {
      assignedAgentId: agentId,
      sentAt: Date.now() + 1000,
      channelName: "+15551234567",
    });
  });

  // 2. Team member reply (human)
  await t.run(async (ctx) => {
    const { saveHumanReply } = await import("./chat/threads");
    await saveHumanReply(ctx, conversation!.threadId, "Hi there, I am a support agent here to assist.", {
      assignedAgentId: agentId,
      authorUserId: humanWorkosUserId,
      sentAt: Date.now() + 2000,
    });
  });

  // 3. AI agent reply
  await t.run(async (ctx) => {
    const { saveAiReply } = await import("./chat/threads");
    await saveAiReply(ctx, conversation!.threadId, "Hello, I am Support Bot (Alex).", agentId, Date.now() + 3000);
  });

  // Query and list the messages as the UI would
  // Mock authentication context for the list query
  const testWithAuth = t.withIdentity({
    subject: humanWorkosUserId,
    email: "jane.doe@example.com",
  });

  const queryResult = await testWithAuth.query(api.chat.inbox.listThreadMessagesForInbox, {
    threadId: conversation!.threadId,
    conversationId: conversation!._id,
    paginationOpts: { numItems: 50, cursor: null },
  });

  console.log("QUERY RESULT PAGE:", JSON.stringify(queryResult.page, null, 2));

  // Page should have:
  // - Message 0: Incoming customer message (role: user)
  // - Message 1: Channel reply (role: assistant)
  // - Message 2: Team member reply (role: assistant)
  // - Message 3: AI reply (role: assistant)
  expect(queryResult.page.length).toBe(4);

  // Check display names
  // 1. Synced historical channel reply
  const channelMsg = queryResult.page[1];
  expect(channelMsg.role).toBe("assistant");
  expect(channelMsg.agentName).toBe("+15551234567"); // Must display the channel name
  expect(channelMsg.sentByAi).toBe(false);

  // 2. Human team member reply
  const humanMsg = queryResult.page[2];
  expect(humanMsg.role).toBe("assistant");
  expect(humanMsg.agentName).toBe("Jane Doe"); // Must dynamically resolve and display the human's name
  expect(humanMsg.sentByAi).toBe(false);

  // 3. AI Agent reply
  const aiMsg = queryResult.page[3];
  expect(aiMsg.role).toBe("assistant");
  expect(aiMsg.agentName).toBe("Support Bot (Alex)"); // Must display the agent's name
  expect(aiMsg.sentByAi).toBe(true);
});
