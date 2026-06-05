/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test, vi, beforeAll } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import workpoolSchema from "../node_modules/@convex-dev/workpool/dist/component/schema.js";
import agentSchema from "../node_modules/@convex-dev/agent/dist/component/schema.js";
import stripeSchema from "../node_modules/@convex-dev/stripe/dist/component/schema.js";
import stripePlanSchema from "../node_modules/@convex-dev/stripe/dist/component/schema.js";

beforeAll(() => {
  // Mock Stripe price env vars required by resolvePlanKeyFromStripePriceId
  process.env.STRIPE_PRICE_STANDARD_MONTHLY = "price_standard_monthly";
  process.env.STRIPE_PRICE_STANDARD_ANNUAL = "price_standard_annual";
  process.env.STRIPE_PRICE_PRO_MONTHLY = "price_pro_monthly";
  process.env.STRIPE_PRICE_PRO_ANNUAL = "price_pro_annual";
  process.env.STRIPE_PRICE_ULTRA_MONTHLY = "price_ultra_monthly";
  process.env.STRIPE_PRICE_ULTRA_ANNUAL = "price_ultra_annual";
  process.env.STRIPE_PRICE_EXTRA_CREDITS = "price_extra_credits";
});

const { mockModel, internalAction } = await vi.hoisted(async () => {
  const agent = await import("@convex-dev/agent");
  const server = await import("./_generated/server");
  return { mockModel: agent.mockModel, internalAction: server.internalAction };
});

// Mock the openRouterModel call to return a mock model that vitest can run without API keys
vi.mock("./llm/openRouter", () => {
  return {
    openRouterModel: () => {
      return mockModel({
        content: [{ type: "text", text: "Mock response text" }],
      });
    },
  };
});

// Mock the internalSendAiReply action to bypass Meta API calls
vi.mock("./chat/inboxActions", () => {
  const { v } = require("convex/values");
  return {
    internalSendAiReply: internalAction({
      args: {
        conversationId: v.id("conversations"),
        content: v.string(),
        mediaUrls: v.array(v.string()),
        allowHumanAgentTag: v.optional(v.boolean()),
      },
      handler: async () => {
        return {
          ok: true,
          textExternalId: "mock-external-id",
        };
      },
    }),
  };
});

const modules = import.meta.glob("./**/*.ts");

test("Incoming message is saved exactly once to the agent thread", async () => {
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

  // 1. Setup mock Agent
  const agentId = await t.run(async (ctx) => {
    return await ctx.db.insert("agents", {
      name: "Support Agent",
      provider: "openrouter",
      model: "deepseek/deepseek-v4-flash",
      systemPrompt: "You are a support agent.",
      templateKey: "blank",
      fileSize: 0,
      userId: "user-123",
      orgId: "org-123",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });

  // 2. Setup mock Channel
  const channelId = await t.run(async (ctx) => {
    return await ctx.db.insert("channels", {
      orgId: "org-123",
      service: "whatsapp",
      phoneNumberId: "phone-id-123",
      accessToken: "token-123",
      status: "connected",
      connectedByUserId: "user-123",
      defaultAgentId: agentId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });

  // 3. Ingest an incoming message
  const result = await t.mutation(internal.chat.inbox.internalIngestChannelMessage, {
    channelId,
    externalId: "ext-msg-123",
    contactAddress: "+60123456789",
    contactName: "John Doe",
    direction: "incoming",
    content: "Hello there",
    contentType: "text",
    timestampMs: Date.now(),
    isHistorical: true,
  });

  // Fetch the conversation and check the thread
  const conv = await t.run(async (ctx) => {
    return await ctx.db.get(result.conversationId);
  });
  expect(conv).not.toBeNull();

  // Query the agent component's messages for this thread
  const agentMessages = await t.runInComponent("agent", async (ctx) => {
    return await ctx.db.query("messages").collect();
  });

  // We should have exactly ONE message in the thread (the incoming user message)
  expect(agentMessages.length).toBe(1);
  expect(agentMessages[0].message.role).toBe("user");
  expect(agentMessages[0].text).toBe("Hello there");
});

test("AI reply worker executes correctly with promptMessageId and saveMessages='none'", async () => {
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

  // 1. Setup mock User & Team & Agent & Channel & Conversation
  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      workosUserId: "user-123",
      email: "test@example.com",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });

  await t.run(async (ctx) => {
    await ctx.db.insert("teams", {
      type: "organizational",
      name: "Mock Team",
      ownerId: userId,
      workosOrgId: "org-123",
      stripeSubscriptionId: "sub-123",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });

  const agentId = await t.run(async (ctx) => {
    return await ctx.db.insert("agents", {
      name: "Support Agent",
      provider: "openrouter",
      model: "deepseek/deepseek-v4-flash",
      systemPrompt: "You are a support agent.",
      templateKey: "blank",
      fileSize: 0,
      userId: "user-123",
      orgId: "org-123",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });

  const channelId = await t.run(async (ctx) => {
    return await ctx.db.insert("channels", {
      orgId: "org-123",
      service: "whatsapp",
      phoneNumberId: "phone-id-123",
      accessToken: "token-123",
      status: "connected",
      connectedByUserId: "user-123",
      defaultAgentId: agentId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });

  // Mock Stripe Subscription inside stripe component
  await t.runInComponent("stripe", async (ctx) => {
    await ctx.db.insert("subscriptions", {
      stripeSubscriptionId: "sub-123",
      stripeCustomerId: "cust-123",
      status: "active",
      currentPeriodEnd: Math.floor(Date.now() / 1000) + 86400 * 30,
      cancelAtPeriodEnd: false,
      priceId: "price_pro_monthly",
    });
  });

  // Ingest incoming message to create the conversation and save it to the agent thread
  const result = await t.mutation(internal.chat.inbox.internalIngestChannelMessage, {
    channelId,
    externalId: "ext-msg-456",
    contactAddress: "+60123456789",
    contactName: "Jane Doe",
    direction: "incoming",
    content: "Help me",
    contentType: "text",
    timestampMs: Date.now(),
    isHistorical: true,
  });

  // Mock Stripe Subscription and credits so that checkAiFeature and credits pass
  await t.run(async (ctx) => {
    await ctx.db.insert("creditPeriods", {
      orgId: "org-123",
      periodKey: "2026-06",
      amount: 1000,
      balance: 1000,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });

  // Directly run generateAiReplyWorker (normally run by the workpool)
  await t.action(internal.chat.inbox.generateAiReplyWorker, {
    conversationId: result.conversationId,
    promptContent: "Help me",
    promptMessageId: result.agentMessageId,
  });

  // Query messages inside the agent component
  const agentMessages = await t.runInComponent("agent", async (ctx) => {
    return await ctx.db.query("messages").collect();
  });

  // Check the messages in the agent thread
  // There should be exactly 3 messages:
  // 1. User message "Help me" (from ingestChannelMessage)
  // 2. User spacer message (from internalPersistAiReply -> saveAiReply -> saveAssistantWithOwnOrder)
  // 3. Assistant message "Mock response text" (from internalPersistAiReply -> saveAiReply -> saveAssistantWithOwnOrder)
  // If the agent component had automatically saved prompt/outputs, there would be duplicates.
  expect(agentMessages.length).toBe(3);
  expect(agentMessages[0].message.role).toBe("user");
  expect(agentMessages[0].text).toBe("Help me");
  expect(agentMessages[1].message.role).toBe("user"); // spacer
  expect(agentMessages[2].message.role).toBe("assistant");
  expect(agentMessages[2].text).toBe("Mock response text");
});
