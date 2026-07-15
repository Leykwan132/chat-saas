/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, beforeAll, expect, test, vi } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";
import { withComponents } from "./testUtils";
import workpoolSchema from "../node_modules/@convex-dev/workpool/dist/component/schema.js";
import agentSchema from "../node_modules/@convex-dev/agent/dist/component/schema.js";
import aggregateSchema from "../node_modules/@convex-dev/aggregate/dist/component/schema.js";

const modules = import.meta.glob("./**/*.ts");

beforeAll(() => {
  // Instruct followUpWorker to bypass actual Meta API fetch requests
  process.env.SKIP_MESSAGE_TEMPLATE_SEND = "true";
  process.env.WHATSAPP_BROADCAST_ESTIMATE_MYR_PER_MESSAGE = "0.35";
});

afterEach(() => {
  vi.useRealTimers();
});

test("WhatsApp Automated Follow-up Scan & Schedule Flow", async () => {
  vi.useFakeTimers();
  const t = convexTest(schema, modules);

  // Register the workpool component
  t.registerComponent("followUpWorkpool", workpoolSchema, {
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
  });

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

  const mockAggregate = {
    "public": () => import("../node_modules/@convex-dev/aggregate/dist/component/public.js"),
    "_generated/server": () => import("../node_modules/@convex-dev/aggregate/dist/component/_generated/server.js"),
  };
  t.registerComponent("analyticsMetrics", aggregateSchema, mockAggregate);

  // 1. Setup mock Agent
  const agentId = await t.run(async (ctx) => {
    return await ctx.db.insert("agents", {
      name: "Follow-up Agent",
      provider: "google",
      model: "gemini-2.5",
      systemPrompt: "Follow up prompt",
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
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });

  await t.run(async (ctx) => {
    const now = Date.now();
    for (const [name, text] of [
      ["followup_temp_1", "Hi, are you still interested?"],
      ["followup_temp_2", "Would you like more information?"],
    ] as const) {
      await ctx.db.insert("whatsappTemplates", {
        orgId: "org-123",
        channelId,
        name,
        language: "en",
        purpose: "follow_up",
        category: "MARKETING",
        components: [{ type: "BODY", text }],
        status: "submitted",
        createdAt: now,
      });
    }
  });

  // 3. Setup mock Customer (Hot lead, tag "interested")
  const customerId = await t.run(async (ctx) => {
    return await ctx.db.insert("customers", {
      orgId: "org-123",
      service: "whatsapp",
      contactAddress: "+60123456789",
      source: "whatsapp",
      tags: ["interested"],
      leadTemperature: "Hot",
      firstSeenAt: Date.now() - 86400 * 1000,
      lastSeenAt: Date.now() - 7200 * 1000, // last seen 2 hours ago
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });

  // 4. Setup mock Conversation (last message was outbound, 2 hours ago)
  const lastMsgAt = Date.now() - 7200 * 1000;
  const agentThreadId = await withComponents(t).runInComponent("agent", async (ctx) => {
    return await ctx.db.insert("threads", {
      userId: "org-123",
      title: "WhatsApp Conversation Thread",
      status: "active",
    });
  });

  const conversationId = await t.run(async (ctx) => {
    const convId = await ctx.db.insert("conversations", {
      orgId: "org-123",
      channelId,
      service: "whatsapp",
      orgAddress: "phone-id-123",
      contactAddress: "+60123456789",
      customerId,
      status: "open",
      assignToAiAgent: false,
      threadId: agentThreadId,
      lastMessageAt: lastMsgAt,
      lastCustomerMessageAt: Date.now() - 10000 * 1000, // customer last message way in the past (outbound last message)
      unreadCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Link customer to conversation
    await ctx.db.patch(customerId, { lastConversationId: convId });
    return convId;
  });

  // 5. Setup mock Follow-up Rule (triggers in 1 hour, max 2 attempts)
  const ruleId = await t.run(async (ctx) => {
    return await ctx.db.insert("followUpRules", {
      agentId,
      orgId: "org-123",
      channelId,
      name: "Follow-up Hot Leads",
      attempts: [
        { attemptNumber: 1, templateName: "followup_temp_1", templateLanguage: "en" },
        { attemptNumber: 2, templateName: "followup_temp_2", templateLanguage: "en" },
      ],
      maxAttempts: 2,
      triggerDelayHours: 1, // 1 hour delay
      intervalHours: 2,
      audienceLeadTemperatures: ["Hot"],
      audienceTags: ["interested"],
      isActive: true,
      messagesSentCount: 0,
      repliesReceivedCount: 0,
      estimatedCostPerCustomer: 0.70,
      createdBy: "user-123",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });

  // --- TEST SCAN ---
  // Run scan mutation
  const scanResult = await t.mutation(internal.whatsappFollowUp.runDailyFollowUpScan, {});
  expect(scanResult.scheduledCount).toBe(1);

  // Verify Customer status updated to pending
  const pendingCustomer = await t.run(async (ctx) => {
    return await ctx.db.get(customerId);
  });
  expect(pendingCustomer?.followUpPending).toBe(true);
  expect(pendingCustomer?.followUpPendingRuleId).toBe(ruleId);
  expect(pendingCustomer?.followUpScheduledAt).toBe(lastMsgAt + 1 * 3600 * 1000);

  // --- TEST WORKER & COMPLETION (Attempt 1) ---
  // Run worker action
  const workerResult = await t.action(internal.followUpPool.followUpWorker, {
    customerId,
    ruleId,
    expectedTime: lastMsgAt + 1 * 3600 * 1000,
    scheduledLastMessageAt: lastMsgAt,
  });

  expect(workerResult).toMatchObject({
    ok: true,
    templateName: "followup_temp_1",
    templateLanguage: "en",
    attemptNumber: 1,
  });

  // Complete mutation (simulate workpool scheduler callback)
  await t.mutation(internal.followUpPool.followUpComplete, {
    workId: "work-123",
    context: {
      customerId,
      ruleId,
      attemptNumber: 1,
      expectedTime: lastMsgAt + 1 * 3600 * 1000,
      scheduledLastMessageAt: lastMsgAt,
    },
    result: { kind: "success", returnValue: workerResult },
  });

  // Verify rule messages count and send logs
  const updatedRule = await t.run(async (ctx) => {
    return await ctx.db.get(ruleId);
  });
  expect(updatedRule?.messagesSentCount).toBe(1);

  const sends = await t.run(async (ctx) => {
    return await ctx.db.query("followUpSends").collect();
  });
  expect(sends.length).toBe(1);
  expect(sends[0]).toMatchObject({
    ruleId,
    recipientPhone: "+60123456789",
    attemptNumber: 1,
    templateName: "followup_temp_1",
    status: "sent",
  });

  // Verify next follow-up scheduled (attempt 2 pending)
  const scheduledCustomer = await t.run(async (ctx) => {
    return await ctx.db.get(customerId);
  });
  expect(scheduledCustomer?.followUpPending).toBe(true);
  expect(scheduledCustomer?.followUpAttempt).toBe(1); // updated to args.nextAttemptNumber - 1 = 2 - 1 = 1 in scheduleNextAttempt

  // --- TEST SCAN (should skip since customer.followUpPending is true) ---
  const scanResult2 = await t.mutation(internal.whatsappFollowUp.runDailyFollowUpScan, {});
  expect(scanResult2.scheduledCount).toBe(0);

  // --- TEST STALE/ACTIVITY SKIP ---
  // If the conversation gets new activity (e.g. customer replies or agent messages)
  const newMsgAt = Date.now();
  await t.run(async (ctx) => {
    await ctx.db.patch(conversationId, {
      lastMessageAt: newMsgAt,
      lastCustomerMessageAt: newMsgAt, // customer reply
    });
  });

  // Worker runs for Attempt 2 with old scheduled last message
  const workerResultStale = await t.action(internal.followUpPool.followUpWorker, {
    customerId,
    ruleId,
    expectedTime: scheduledCustomer!.followUpScheduledAt!,
    scheduledLastMessageAt: lastMsgAt, // stale message timestamp
  });
  expect(workerResultStale).toMatchObject({
    skipped: true,
    reason: "Conversation has new activity",
  });

  // Complete stale
  await t.mutation(internal.followUpPool.followUpComplete, {
    workId: "work-124",
    context: {
      customerId,
      ruleId,
      attemptNumber: 2,
      expectedTime: scheduledCustomer!.followUpScheduledAt!,
      scheduledLastMessageAt: lastMsgAt,
    },
    result: { kind: "success", returnValue: workerResultStale },
  });

  // Verify followUpPending cleared on skip
  const skippedCustomer = await t.run(async (ctx) => {
    return await ctx.db.get(customerId);
  });
  expect(skippedCustomer?.followUpPending).toBe(false);
  expect(skippedCustomer?.followUpPendingRuleId).toBeUndefined();
});
