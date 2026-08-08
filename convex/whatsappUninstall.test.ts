/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { withComponents } from "./testUtils";
import agentSchema from "../node_modules/@convex-dev/agent/dist/component/schema.js";

const modules = import.meta.glob("./**/*.ts");

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
  t.registerComponent("agent", agentSchema, agentModules);
  return t;
}

test("PARTNER_APP_UNINSTALLED deletes all data associated with WABA ID", async () => {
  vi.useFakeTimers();
  const t = initTest();
  const wabaId = "waba-test-uninstall-123";

  const threadId = await withComponents(t).runInComponent(
    "agent",
    async (ctx) =>
      await ctx.db.insert("threads", {
        userId: "user-123",
        title: "Uninstall thread",
        status: "active",
      }),
  );

  // Setup mock data
  const { channelId, convId } = await t.run(async (ctx) => {
    // 1. Insert a channel
    const channelId = await ctx.db.insert("channels", {
      orgId: "org-123",
      service: "whatsapp",
      wabaId,
      status: "connected",
      connectedByUserId: "user-123",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // 2. Insert a conversation
    const convId = await ctx.db.insert("conversations", {
      orgId: "org-123",
      channelId,
      service: "whatsapp",
      orgAddress: "address-1",
      contactAddress: "address-2",
      status: "open",
      assignToAiAgent: true,
      threadId,
      lastMessageAt: Date.now(),
      unreadCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // 3. Insert a message
    await ctx.db.insert("messages", {
      orgId: "org-123",
      conversationId: convId,
      channelId,
      service: "whatsapp",
      orgAddress: "address-1",
      contactAddress: "address-2",
      direction: "incoming",
      contentType: "text",
      content: "Hello",
      createdAt: Date.now(),
    });

    // 4. Insert analytics facts
    await ctx.db.insert("conversationAnalyticsFacts", {
      orgId: "org-123",
      conversationId: convId,
      service: "whatsapp",
      incomingMessageCount: 1,
      outgoingMessageCount: 0,
      humanMessageCount: 0,
      aiMessageCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // 5. Insert topic assignments
    const topicId = await ctx.db.insert("conversationTopics", {
      orgId: "org-123",
      name: "Refunds",
      slug: "refunds",
      totalCount: 1,
      weekCount: 1,
      lastSeenAt: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await ctx.db.insert("conversationTopicAssignments", {
      orgId: "org-123",
      conversationId: convId,
      topicId,
      confidence: 0.9,
      detectedAt: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // 6. Insert metric entries
    await ctx.db.insert("analyticsMetricEntries", {
      namespace: "usage",
      sortKey: Date.now(),
      value: 1,
      metric: "conversationCount",
      orgId: "org-123",
      sourceConversationId: convId,
      sourceKey: "key-123",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // 7. Insert sync request
    await ctx.db.insert("whatsappSyncRequests", {
      channelId,
      orgId: "org-123",
      phoneNumberId: "phone-123",
      syncType: "history",
      status: "pending",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // 8. Insert history staging rows
    const batchId = await ctx.db.insert("whatsappHistorySyncBatches", {
      channelId,
      orgId: "org-123",
      phoneNumberId: "phone-123",
      status: "pending",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    const ingestThreadId = await ctx.db.insert("whatsappHistoryIngestThreads", {
      batchId,
      channelId,
      orgId: "org-123",
      phoneNumberId: "phone-123",
      whatsappThreadId: "15550001",
      contactAddress: "15550001",
      status: "pending",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await ctx.db.insert("whatsappHistoryIngestMessages", {
      channelId,
      orgId: "org-123",
      batchId,
      ingestThreadId,
      externalId: "staging-msg-1",
      whatsappThreadId: "15550001",
      direction: "incoming",
      content: "Hello",
      contentType: "text",
      timestampMs: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // 9. Insert connection attempts
    await ctx.db.insert("whatsappConnectionAttempts", {
      orgId: "org-123",
      connectedByUserId: "user-123",
      status: "syncing",
      wabaId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // 10. Insert account updates
    await ctx.db.insert("whatsappAccountUpdates", {
      wabaId,
      event: "PARTNER_APP_INSTALLED",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { channelId, convId };
  });

  // Verify setup exists before uninstalling
  await t.run(async (ctx) => {
    expect(await ctx.db.get(channelId)).not.toBeNull();
    expect(await ctx.db.get(convId)).not.toBeNull();

    const messages = await ctx.db.query("messages").collect();
    expect(messages.length).toBeGreaterThan(0);

    const syncRequests = await ctx.db.query("whatsappSyncRequests").collect();
    expect(syncRequests.length).toBeGreaterThan(0);

    const attempts = await ctx.db.query("whatsappConnectionAttempts").collect();
    expect(attempts.length).toBeGreaterThan(0);
  });

  // Trigger the uninstall webhook event via the internal handleAccountUpdate mutation
  await t.mutation(internal.whatsappWebhook.handleAccountUpdate, {
    wabaId,
    event: "PARTNER_APP_UNINSTALLED",
  });
  await t.finishAllScheduledFunctions(vi.runAllTimers);

  // Verify all data is removed
  await t.run(async (ctx) => {
    // 1. Channel should be deleted
    expect(await ctx.db.get(channelId)).toBeNull();

    // 2. Conversation should be deleted
    expect(await ctx.db.get(convId)).toBeNull();

    // 3. Messages should be deleted
    const messages = await ctx.db.query("messages").collect();
    expect(messages.length).toBe(0);

    // 4. Analytics facts should be deleted
    const facts = await ctx.db.query("conversationAnalyticsFacts").collect();
    expect(facts.length).toBe(0);

    // 5. Topic assignments should be deleted
    const topics = await ctx.db.query("conversationTopicAssignments").collect();
    expect(topics.length).toBe(0);

    // 6. Metric entries should be deleted
    const metrics = await ctx.db.query("analyticsMetricEntries").collect();
    expect(metrics.length).toBe(0);

    // 7. Sync requests should be deleted
    const syncRequests = await ctx.db.query("whatsappSyncRequests").collect();
    expect(syncRequests.length).toBe(0);

    // 8. History staging rows should be deleted
    const batches = await ctx.db.query("whatsappHistorySyncBatches").collect();
    expect(batches.length).toBe(0);
    const ingestThreads = await ctx.db.query("whatsappHistoryIngestThreads").collect();
    expect(ingestThreads.length).toBe(0);
    const ingestMessages = await ctx.db.query("whatsappHistoryIngestMessages").collect();
    expect(ingestMessages.length).toBe(0);

    // 9. Connection attempts should be deleted
    const attempts = await ctx.db.query("whatsappConnectionAttempts").collect();
    expect(attempts.length).toBe(0);

    // 10. Account updates should be deleted
    const updates = await ctx.db.query("whatsappAccountUpdates").collect();
    expect(updates.length).toBe(0);
  });

  const deletedThread = await withComponents(t).runInComponent(
    "agent",
    async (ctx) => await ctx.db.get(threadId),
  );
  expect(deletedThread).toBeNull();
  vi.useRealTimers();
});

test("PARTNER_REMOVED deletes all data associated with WABA ID", async () => {
  vi.useFakeTimers();
  const t = initTest();
  const wabaId = "waba-test-partner-removed";

  const threadId = await withComponents(t).runInComponent(
    "agent",
    async (ctx) =>
      await ctx.db.insert("threads", {
        userId: "user-123",
        title: "Partner removed thread",
        status: "active",
      }),
  );

  const { channelId, convId } = await t.run(async (ctx) => {
    const channelId = await ctx.db.insert("channels", {
      orgId: "org-123",
      service: "whatsapp",
      wabaId,
      status: "connected",
      connectedByUserId: "user-123",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    const convId = await ctx.db.insert("conversations", {
      orgId: "org-123",
      channelId,
      service: "whatsapp",
      orgAddress: "address-1",
      contactAddress: "address-2",
      status: "open",
      assignToAiAgent: true,
      threadId,
      lastMessageAt: Date.now(),
      unreadCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return { channelId, convId };
  });

  await t.mutation(internal.whatsappWebhook.handleAccountUpdate, {
    wabaId,
    event: "PARTNER_REMOVED",
  });
  await t.finishAllScheduledFunctions(vi.runAllTimers);

  await t.run(async (ctx) => {
    expect(await ctx.db.get(channelId)).toBeNull();
    expect(await ctx.db.get(convId)).toBeNull();
  });

  const deletedThread = await withComponents(t).runInComponent(
    "agent",
    async (ctx) => await ctx.db.get(threadId),
  );
  expect(deletedThread).toBeNull();
  vi.useRealTimers();
});

test("disconnect clears WhatsApp history staging", async () => {
  const t = convexTest(schema, modules);
  const workosUserId = "user-disconnect-staging";

  const testWithAuth = t.withIdentity({
    subject: workosUserId,
    orgId: "personal",
    email: "disconnect-staging@example.com",
  });

  const channelId = await t.run(async (ctx) => {
    const userDbId = await ctx.db.insert("users", {
      workosUserId,
      email: "disconnect-staging@example.com",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    const teamId = await ctx.db.insert("teams", {
      type: "personal",
      name: "Personal",
      ownerId: userDbId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await ctx.db.patch(userDbId, { activeTeamId: teamId });

    const channelId = await ctx.db.insert("channels", {
      orgId: "",
      service: "whatsapp",
      wabaId: "waba-disconnect-staging",
      status: "connected",
      connectedByUserId: workosUserId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const batchId = await ctx.db.insert("whatsappHistorySyncBatches", {
      channelId,
      orgId: "",
      phoneNumberId: "phone-123",
      status: "syncing",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    const ingestThreadId = await ctx.db.insert("whatsappHistoryIngestThreads", {
      batchId,
      channelId,
      orgId: "",
      phoneNumberId: "phone-123",
      whatsappThreadId: "15550001",
      contactAddress: "15550001",
      status: "pending",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await ctx.db.insert("whatsappHistoryIngestMessages", {
      channelId,
      orgId: "",
      batchId,
      ingestThreadId,
      externalId: "staging-msg-disconnect",
      whatsappThreadId: "15550001",
      direction: "incoming",
      content: "Hello",
      contentType: "text",
      timestampMs: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return channelId;
  });

  await testWithAuth.mutation(api.channels.disconnect, { channelId });

  await t.run(async (ctx) => {
    expect(await ctx.db.query("whatsappHistorySyncBatches").collect()).toHaveLength(0);
    expect(await ctx.db.query("whatsappHistoryIngestThreads").collect()).toHaveLength(0);
    expect(await ctx.db.query("whatsappHistoryIngestMessages").collect()).toHaveLength(0);

    const channel = await ctx.db.get(channelId);
    expect(channel?.status).toBe("disconnected");
  });
});
