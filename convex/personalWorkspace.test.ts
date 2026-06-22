/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import workpoolSchema from "../node_modules/@convex-dev/workpool/dist/component/schema.js";
import agentSchema from "../node_modules/@convex-dev/agent/dist/component/schema.js";

const modules = import.meta.glob("./**/*.ts");

test("Personal Workspace Broadcast & Template Flow", async () => {
  const t = convexTest(schema, modules);

  // Register the broadcastWorkpool component
  t.registerComponent("broadcastWorkpool", workpoolSchema, {
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

  const workosUserId = "user-personal-123";

  // Mock a personal identity
  const testWithAuth = t.withIdentity({
    subject: workosUserId,
    orgId: "personal",
    email: "personal@example.com",
  });

  // Setup database records
  const { userDbId, teamId, agentId, channelId } = await t.run(async (ctx) => {
    const userDbId = await ctx.db.insert("users", {
      workosUserId,
      email: "personal@example.com",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const teamId = await ctx.db.insert("teams", {
      type: "personal",
      name: "Personal Workspace",
      ownerId: userDbId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await ctx.db.patch(userDbId, { activeTeamId: teamId });

    const agentId = await ctx.db.insert("agents", {
      name: "Personal Agent",
      provider: "google",
      model: "gemini-2.5",
      systemPrompt: "Personal system prompt",
      templateKey: "blank",
      fileSize: 0,
      userId: workosUserId,
      orgId: "personal",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // In personal workspaces, channel orgId is the workosUserId
    const channelId = await ctx.db.insert("channels", {
      orgId: workosUserId,
      service: "whatsapp",
      wabaId: "waba-id-personal",
      phoneNumberId: "phone-id-personal",
      accessToken: "token-personal",
      status: "connected",
      connectedByUserId: workosUserId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { userDbId, teamId, agentId, channelId };
  });

  // 1. Create a WhatsApp local template
  const { templateId } = await testWithAuth.mutation(api.whatsappTemplates.createLocalTemplate, {
    channelId,
    name: "personal_template",
    language: "en",
    purpose: "broadcasting",
    components: [],
  });
  expect(templateId).toBeDefined();

  // 2. List WhatsApp local templates
  const templates = await testWithAuth.query(api.whatsappTemplates.listLocalTemplates, {
    channelId,
  });
  expect(templates.length).toBe(1);
  expect(templates[0]).toMatchObject({
    name: "personal_template",
    orgId: workosUserId,
  });

  // 3. Setup mock Customer under the personal account (orgId = workosUserId)
  const customerId = await t.run(async (ctx) => {
    return await ctx.db.insert("customers", {
      orgId: workosUserId,
      service: "whatsapp",
      contactAddress: "+60111111111",
      source: "whatsapp",
      tags: ["vip"],
      firstSeenAt: Date.now(),
      lastSeenAt: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });

  // 4. List WhatsApp broadcast candidates
  const candidates = await testWithAuth.query(api.customers.listWhatsAppBroadcastCandidates, {
    channelId,
  });
  // Since there is no conversation yet, candidate list will have customerId = undefined but list the address
  // Let's create a conversation first so candidate list picks it up correctly
  await t.run(async (ctx) => {
    await ctx.db.insert("conversations", {
      orgId: workosUserId,
      channelId,
      service: "whatsapp",
      orgAddress: "phone-id-personal",
      contactAddress: "+60111111111",
      customerId,
      status: "open",
      assignToAiAgent: false,
      threadId: "thread-personal",
      lastMessageAt: Date.now(),
      unreadCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });

  const candidatesWithConv = await testWithAuth.query(api.customers.listWhatsAppBroadcastCandidates, {
    channelId,
  });
  expect(candidatesWithConv.length).toBe(1);
  expect(candidatesWithConv[0]).toMatchObject({
    customerId,
    phone: "+60111111111",
  });

  // 5. Schedule template broadcast
  const { scheduleId } = await testWithAuth.mutation(api.whatsappBroadcast.scheduleTemplateBatch, {
    agentId,
    channelId,
    templateName: "personal_template",
    templateLanguage: "en",
    customerIds: [customerId],
    scheduledAt: Date.now() + 3600 * 1000,
  });
  expect(scheduleId).toBeDefined();

  // 6. Get scheduled broadcast
  const schedule = await testWithAuth.query(api.whatsappBroadcast.getBroadcastSchedule, {
    scheduleId,
  });
  expect(schedule).toBeDefined();
  expect(schedule).toMatchObject({
    orgId: workosUserId,
    templateName: "personal_template",
  });

  // 7. Verify listing schedules for agent
  const schedulesList = await testWithAuth.query(api.whatsappBroadcast.listSchedulesForAgent, {
    agentId,
  });
  expect(schedulesList.length).toBe(1);
  expect(schedulesList[0]._id).toBe(scheduleId);
});
