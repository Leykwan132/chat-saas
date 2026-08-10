/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import type { Id } from "./_generated/dataModel";

const modules = import.meta.glob("./**/*.ts");

function initTest() {
  return convexTest(schema, modules);
}

async function createPersonalUser(t: ReturnType<typeof initTest>, workosUserId: string) {
  return await t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      workosUserId,
      email: `${workosUserId}@example.com`,
      onboarded: true,
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
    await ctx.db.insert("teamMemberships", {
      teamId,
      userId,
      role: "owner",
      createdAt: now,
    });
    await ctx.db.patch(userId, { activeTeamId: teamId, updatedAt: now });
    return { userId, teamId };
  });
}

async function createAgent(t: ReturnType<typeof initTest>, workosUserId: string) {
  return await t.run(async (ctx) => {
    const now = Date.now();
    return await ctx.db.insert("agents", {
      name: "Setup Agent",
      provider: "openrouter",
      model: "deepseek/deepseek-v4-flash",
      systemPrompt: "Help customers.",
      templateKey: "blank",
      fileSize: 0,
      userId: workosUserId,
      orgId: "",
      createdAt: now,
      updatedAt: now,
    });
  });
}

test("getWorkspaceSetupChecklist starts visible with empty progress", async () => {
  const t = initTest();
  const workosUserId = "user-checklist-empty";
  await createPersonalUser(t, workosUserId);

  const checklist = await t.withIdentity({ subject: workosUserId }).query(
    api.workspaceSetupChecklist.getWorkspaceSetupChecklist,
    {},
  );

  expect(checklist.visible).toBe(true);
  expect(checklist.shouldShowIntro).toBe(true);
  expect(checklist.completedCount).toBe(0);
  expect(checklist.totalCount).toBe(6);
  expect(checklist.steps.map((step) => [step.key, step.completed])).toEqual([
    ["createAgent", false],
    ["uploadKnowledgeBase", false],
    ["testAgent", false],
    ["createWorkflow", false],
    ["createService", false],
    ["connectChannel", false],
  ]);
});

test("getWorkspaceSetupChecklist infers selected agent progress", async () => {
  const t = initTest();
  const workosUserId = "user-checklist-progress";
  await createPersonalUser(t, workosUserId);
  const agentId = await createAgent(t, workosUserId);

  await t.run(async (ctx) => {
    const now = Date.now();
    const workflowId = await ctx.db.insert("workflows", {
      agentId,
      orgId: "",
      userId: workosUserId,
      name: "Setup Workflow",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("workflowNodes", {
      workflowId,
      kind: "start",
      title: "Message enters",
      positionX: 0,
      positionY: 0,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("workflowNodes", {
      workflowId,
      kind: "sendText",
      title: "Send reply",
      positionX: 260,
      positionY: 140,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("textEntries", {
      agentId,
      title: "Hours",
      content: "Open daily.",
      fileSize: 18,
      userId: workosUserId,
      orgId: "",
      createdAt: now,
    });
    const conversationId = await ctx.db.insert("conversations", {
      orgId: "",
      userId: workosUserId,
      service: "playground",
      orgAddress: "agent",
      contactAddress: "user",
      status: "open",
      assignedAgentId: agentId,
      assignedUserId: workosUserId,
      assignToAiAgent: false,
      threadId: "thread-checklist-progress",
      lastMessageAt: now,
      unreadCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("messages", {
      orgId: "",
      conversationId,
      service: "playground",
      orgAddress: "agent",
      contactAddress: "user",
      direction: "outgoing",
      agentId,
      contentType: "text",
      content: "Hello from the agent.",
      status: "sent",
      createdAt: now,
    });
    const channelId = await ctx.db.insert("channels", {
      orgId: "",
      service: "web",
      status: "connected",
      connectedByUserId: workosUserId,
      defaultAgentId: agentId,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("webWidgetSettings", {
      channelId,
      agentId,
      orgId: "",
      connectedByUserId: workosUserId,
      publicKey: "pub_checklist_progress",
      enabled: true,
      agentDisplayName: "Setup Agent",
      createdAt: now,
      updatedAt: now,
    });
  });

  await t.withIdentity({ subject: workosUserId }).mutation(
    api.appointmentBooking.services.createService,
    { agentId, name: "Consultation" },
  );

  const checklist = await t.withIdentity({ subject: workosUserId }).query(
    api.workspaceSetupChecklist.getWorkspaceSetupChecklist,
    { agentId: agentId as Id<"agents"> },
  );

  expect(checklist.completedCount).toBe(6);
  expect(checklist.progress).toBe(100);
  expect(checklist.visible).toBe(true);
  expect(checklist.shouldShowIntro).toBe(true);
  expect(checklist.selectedAgentId).toBe(agentId);
  expect(checklist.steps.every((step) => step.completed)).toBe(true);
});

test("getWorkspaceSetupChecklist marks agent creation complete when multiple agents exist", async () => {
  const t = initTest();
  const workosUserId = "user-checklist-multiple-agents";
  await createPersonalUser(t, workosUserId);
  await createAgent(t, workosUserId);
  await createAgent(t, workosUserId);

  const checklist = await t.withIdentity({ subject: workosUserId }).query(
    api.workspaceSetupChecklist.getWorkspaceSetupChecklist,
    {},
  );

  expect(checklist.completedCount).toBe(1);
  expect(checklist.selectedAgentId).toBeUndefined();
  expect(checklist.steps).toContainEqual({
    key: "createAgent",
    completed: true,
  });
});

test("workspace setup checklist state mutations hide intro and checklist", async () => {
  const t = initTest();
  const workosUserId = "user-checklist-state";
  await createPersonalUser(t, workosUserId);
  const authed = t.withIdentity({ subject: workosUserId });

  await authed.mutation(
    api.workspaceSetupChecklist.recordWorkspaceSetupChecklistIntroShown,
    {},
  );
  const afterIntro = await authed.query(
    api.workspaceSetupChecklist.getWorkspaceSetupChecklist,
    {},
  );

  expect(afterIntro.visible).toBe(true);
  expect(afterIntro.shouldShowIntro).toBe(false);

  await authed.mutation(
    api.workspaceSetupChecklist.completeWorkspaceSetupChecklist,
    {},
  );
  const afterComplete = await authed.query(
    api.workspaceSetupChecklist.getWorkspaceSetupChecklist,
    {},
  );

  expect(afterComplete.visible).toBe(false);
  expect(afterComplete.shouldShowIntro).toBe(false);
});
