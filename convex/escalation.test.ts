/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test, beforeAll } from "vitest";
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
  process.env.STRIPE_PRICE_EXTRA_CREDITS = "price_extra_credits";
});

const modules = import.meta.glob("./**/*.ts");

test("Smart escalation lifecycle: trigger, resolve, and auto-resolve", async () => {
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

  const workosUserId = "workos-user-test";
  const orgId = "org-test-123";

  // Mock Identity
  const testWithAuth = t.withIdentity({
    subject: workosUserId,
    orgId: orgId,
    email: "test@example.com",
    role: "member",
  });

  // Setup mock User, Org, Team, and Membership
  await t.run(async (ctx) => {
    const { ensureUserAccount, ensureOrganizationalTeam, setActiveTeamForUser } = await import("./teamHelpers");
    const userDbId = await ensureUserAccount(ctx, {
      workosUserId,
      email: "test@example.com",
      firstName: "Jane",
      lastName: "Test",
    });



    const teamId = await ensureOrganizationalTeam(ctx, {
      workosOrgId: orgId,
      name: "Test Org Team",
      ownerUserId: userDbId,
    });

    const user = (await ctx.db.get(userDbId))!;
    await setActiveTeamForUser(ctx, user, teamId);
  });

  // Setup mock Agent
  const agentId = await t.run(async (ctx) => {
    return await ctx.db.insert("agents", {
      name: "Support Bot",
      provider: "openrouter",
      model: "google/gemini-2.5-flash",
      systemPrompt: "You are a support agent.",
      templateKey: "blank",
      fileSize: 0,
      userId: workosUserId,
      orgId,
      escalationEnabled: true,
      escalationMessage: "A human teammate has been notified.",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });

  // Setup mock Channel
  const channelId = await t.run(async (ctx) => {
    return await ctx.db.insert("channels", {
      orgId,
      service: "whatsapp",
      phoneNumberId: "phone-test",
      displayPhoneNumber: "+15551112222",
      accessToken: "token-test",
      status: "connected",
      connectedByUserId: workosUserId,
      defaultAgentId: agentId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });

  // Ingest an incoming message to start the conversation and thread
  const ingestResult = await t.mutation(internal.chat.inbox.internalIngestChannelMessage, {
    channelId,
    externalId: "ext-123",
    contactAddress: "+60123456789",
    contactName: "John Customer",
    direction: "incoming",
    content: "Hi, I want a refund",
    contentType: "text",
    timestampMs: Date.now(),
    isHistorical: true,
  });

  const conversationId = ingestResult.conversationId;

  // 1. Initial State: AI replies should be assigned
  let conv = await t.run(async (ctx) => {
    return await ctx.db.get(conversationId);
  });
  expect(conv!.assignToAiAgent).toBe(true);
  expect(conv!.status).toBe("open");
  expect(conv!.escalation).toBeUndefined();

  // 2. Trigger Escalation
  await t.mutation(internal.chat.inbox.internalEscalateConversation, {
    conversationId,
    question: "How do I request a refund?",
    context: "User wants a refund, refund policies not in knowledge base.",
  });

  conv = await t.run(async (ctx) => {
    return await ctx.db.get(conversationId);
  });
  expect(conv!.status).toBe("requires_user_input");
  expect(conv!.assignToAiAgent).toBe(false);
  expect(conv!.escalation).toEqual({
    question: "How do I request a refund?",
    context: "User wants a refund, refund policies not in knowledge base.",
    escalatedAt: expect.any(Number),
  });

  // 3. Resolve Escalation Manually
  await testWithAuth.mutation(api.conversations.resolveEscalation, {
    conversationId,
  });

  conv = await t.run(async (ctx) => {
    return await ctx.db.get(conversationId);
  });
  expect(conv!.status).toBe("open");
  expect(conv!.escalation).toBeUndefined();
  expect(conv!.assignToAiAgent).toBe(false); // Should remain false (paused) until manually toggled

  // 4. Trigger Escalation Again
  await t.mutation(internal.chat.inbox.internalEscalateConversation, {
    conversationId,
    question: "Another unsure query?",
    context: "Testing auto-resolve on human reply.",
  });

  conv = await t.run(async (ctx) => {
    return await ctx.db.get(conversationId);
  });
  expect(conv!.status).toBe("requires_user_input");

  // 5. Auto-resolve on Human Reply
  await t.mutation(internal.chat.inbox.internalPersistHumanReply, {
    conversationId,
    content: "No worries, I can help you with your refund.",
    authorUserId: workosUserId,
  });

  conv = await t.run(async (ctx) => {
    return await ctx.db.get(conversationId);
  });
  expect(conv!.status).toBe("open");
  expect(conv!.escalation).toBeUndefined();
  expect(conv!.assignToAiAgent).toBe(false); // Remains false (paused)

  // 6. Toggling AI replies manually back to true should also clear escalation
  await t.mutation(internal.chat.inbox.internalEscalateConversation, {
    conversationId,
    question: "Third unsure query?",
    context: "Testing clear on AI replies enabled.",
  });

  conv = await t.run(async (ctx) => {
    return await ctx.db.get(conversationId);
  });
  expect(conv!.status).toBe("requires_user_input");

  // Toggle AI replies manually
  await testWithAuth.mutation(api.conversations.setConversationAiEnabled, {
    conversationId,
    enabled: true,
  });

  conv = await t.run(async (ctx) => {
    return await ctx.db.get(conversationId);
  });
  expect(conv!.status).toBe("open");
  expect(conv!.escalation).toBeUndefined();
  expect(conv!.assignToAiAgent).toBe(true);
});

test("escalates without sending a customer message when escalationMessage is unset", async () => {
  const t = convexTest(schema, modules);

  t.registerComponent("stripe", stripeSchema, {
    "public": () => import("../node_modules/@convex-dev/stripe/dist/component/public.js"),
    "private": () => import("../node_modules/@convex-dev/stripe/dist/component/private.js"),
    "_generated/server": () => import("../node_modules/@convex-dev/stripe/dist/component/_generated/server.js"),
  });

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

  t.registerComponent("agent", agentSchema, {
    "apiKeys": () => import("../node_modules/@convex-dev/agent/dist/component/apiKeys.js"),
    "files": () => import("../node_modules/@convex-dev/agent/dist/component/files.js"),
    "messages": () => import("../node_modules/@convex-dev/agent/dist/component/messages.js"),
    "streams": () => import("../node_modules/@convex-dev/agent/dist/component/streams.js"),
    "threads": () => import("../node_modules/@convex-dev/agent/dist/component/threads.js"),
    "users": () => import("../node_modules/@convex-dev/agent/dist/component/users.js"),
    "_generated/server": () => import("../node_modules/@convex-dev/agent/dist/component/_generated/server.js"),
  });

  const workosUserId = "workos-user-test-no-msg";
  const orgId = "org-test-no-msg";

  await t.run(async (ctx) => {
    const { ensureUserAccount, ensureOrganizationalTeam, setActiveTeamForUser } = await import("./teamHelpers");
    const userDbId = await ensureUserAccount(ctx, {
      workosUserId,
      email: "nomsg@example.com",
      firstName: "No",
      lastName: "Message",
    });



    const teamId = await ensureOrganizationalTeam(ctx, {
      workosOrgId: orgId,
      name: "Test Org Team",
      ownerUserId: userDbId,
    });

    const user = (await ctx.db.get(userDbId))!;
    await setActiveTeamForUser(ctx, user, teamId);
  });

  const agentId = await t.run(async (ctx) => {
    return await ctx.db.insert("agents", {
      name: "Support Bot",
      provider: "openrouter",
      model: "google/gemini-2.5-flash",
      systemPrompt: "You are a support agent.",
      templateKey: "blank",
      fileSize: 0,
      userId: workosUserId,
      orgId,
      escalationEnabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });

  const channelId = await t.run(async (ctx) => {
    return await ctx.db.insert("channels", {
      orgId,
      service: "whatsapp",
      phoneNumberId: "phone-test-no-msg",
      displayPhoneNumber: "+15553334444",
      accessToken: "token-test",
      status: "connected",
      connectedByUserId: workosUserId,
      defaultAgentId: agentId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });

  const ingestResult = await t.mutation(internal.chat.inbox.internalIngestChannelMessage, {
    channelId,
    externalId: "ext-no-msg",
    contactAddress: "+60111111111",
    contactName: "Jane Customer",
    direction: "incoming",
    content: "Can you help me?",
    contentType: "text",
    timestampMs: Date.now(),
    isHistorical: true,
  });

  await t.mutation(internal.chat.inbox.internalEscalateConversation, {
    conversationId: ingestResult.conversationId,
    question: "Can you help me?",
    context: "No knowledge base coverage for this request.",
  });

  const conv = await t.run(async (ctx) => {
    return await ctx.db.get(ingestResult.conversationId);
  });

  expect(conv!.status).toBe("requires_user_input");
  expect(conv!.assignToAiAgent).toBe(false);
  expect(conv!.escalation).toEqual({
    question: "Can you help me?",
    context: "No knowledge base coverage for this request.",
    escalatedAt: expect.any(Number),
  });
});
