/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import type { Id } from "./_generated/dataModel";
import stripeSchema from "../node_modules/@convex-dev/stripe/dist/component/schema.js";
import { Permission } from "../shared/permissions";

const modules = import.meta.glob("./**/*.ts");

function initTest() {
  const t = convexTest(schema, modules);
  t.registerComponent("stripe", stripeSchema, {
    public: () => import("../node_modules/@convex-dev/stripe/dist/component/public.js"),
    private: () => import("../node_modules/@convex-dev/stripe/dist/component/private.js"),
    "_generated/server": () =>
      import("../node_modules/@convex-dev/stripe/dist/component/_generated/server.js"),
  });
  return t;
}

async function createPersonalAgent(
  t: ReturnType<typeof initTest>,
  workosUserId: string,
  options: { escalationEnabled?: boolean } = {},
) {
  return await t.run(async (ctx) => {
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
      name: "Workflow Agent",
      provider: "openrouter",
      model: "deepseek/deepseek-v4-flash",
      systemPrompt: "Test prompt",
      templateKey: "blank",
      fileSize: 0,
      userId: workosUserId,
      orgId: "",
      ...(options.escalationEnabled !== undefined
        ? { escalationEnabled: options.escalationEnabled }
        : {}),
      createdAt: now,
      updatedAt: now,
    });
    return { agentId };
  });
}

test("agents.create provisions a default workflow", async () => {
  const t = initTest();
  const workosUserId = "user-workflow-create";
  const authed = t.withIdentity({
    subject: workosUserId,
    email: "workflow-create@example.com",
  });

  const agentId = await authed.mutation(api.agents.create, {
    name: "Created Agent",
    businessName: "Workflow Business",
    businessDescription: "Workflow automation services",
    goal: "support",
  });

  const graph = await authed.query(api.workflows.getForAgent, { agentId });
  expect(graph?.nodes.map((node) => node.kind)).toEqual(["start"]);
  expect(graph?.edges).toHaveLength(0);
});

test("ensureForAgent lazily creates one workflow and is idempotent", async () => {
  const t = initTest();
  const workosUserId = "user-workflow-ensure";
  const { agentId } = await createPersonalAgent(t, workosUserId);
  const authed = t.withIdentity({ subject: workosUserId });

  const first = await authed.mutation(api.workflows.ensureForAgent, { agentId });
  const second = await authed.mutation(api.workflows.ensureForAgent, { agentId });

  expect(second.workflow._id).toBe(first.workflow._id);
  expect(second.nodes).toHaveLength(1);
  expect(second.edges).toHaveLength(0);
});

test("ensureForAgent migrates legacy smart escalation into a workflow node", async () => {
  const t = initTest();
  const workosUserId = "user-workflow-legacy-escalation";
  const { agentId } = await createPersonalAgent(t, workosUserId, {
    escalationEnabled: true,
  });
  const authed = t.withIdentity({ subject: workosUserId });

  const first = await authed.mutation(api.workflows.ensureForAgent, { agentId });
  const second = await authed.mutation(api.workflows.ensureForAgent, { agentId });
  const humanEscalationNodes = second.nodes.filter(
    (node) => node.kind === "humanEscalation",
  );
  const humanEscalationEdges = second.edges.filter(
    (edge) => edge.targetNodeId === humanEscalationNodes[0]?._id,
  );

  expect(second.workflow._id).toBe(first.workflow._id);
  expect(humanEscalationNodes).toHaveLength(1);
  expect(humanEscalationNodes[0].title).toBe("Human escalation");
  expect(humanEscalationEdges).toHaveLength(1);
  expect(humanEscalationEdges[0].label).toBe("Needs human");
  await t.run(async (ctx) => {
    const agent = await ctx.db.get(agentId);
    expect(agent?.escalationEnabled).toBe(false);
    expect(agent?.escalationMessage).toBeUndefined();
  });
});

test("addNodeAfter adds child nodes without rewiring existing children", async () => {
  const t = initTest();
  const workosUserId = "user-workflow-add";
  const { agentId } = await createPersonalAgent(t, workosUserId);
  const authed = t.withIdentity({ subject: workosUserId });
  const graph = await authed.mutation(api.workflows.ensureForAgent, { agentId });
  const startNode = graph.nodes.find((node) => node.kind === "start");
  expect(startNode).toBeDefined();

  const withSendMessage = await authed.mutation(api.workflows.addNodeAfter, {
    agentId,
    sourceNodeId: startNode!._id,
    kind: "sendText",
  });
  const sendMessageNode = withSendMessage.nodes.find(
    (node) => node.kind === "sendText",
  );
  expect(sendMessageNode).toBeDefined();
  expect(sendMessageNode!.title).toBe("Send message");
  expect(sendMessageNode!.isReady).toBe(false);

  const withBookAppointment = await authed.mutation(api.workflows.addNodeAfter, {
    agentId,
    sourceNodeId: startNode!._id,
    kind: "bookAppointment",
  });
  const bookAppointmentNode = withBookAppointment.nodes.find(
    (node) => node.kind === "bookAppointment",
  );
  expect(bookAppointmentNode).toBeDefined();
  expect(bookAppointmentNode!.title).toBe("Book appointment");
  expect(bookAppointmentNode!.description).toContain("book only after explicit slot confirmation");

  const withHumanEscalation = await authed.mutation(api.workflows.addNodeAfter, {
    agentId,
    sourceNodeId: startNode!._id,
    kind: "humanEscalation",
  });
  const humanEscalationNode = withHumanEscalation.nodes.find(
    (node) => node.kind === "humanEscalation",
  );
  expect(humanEscalationNode).toBeDefined();
  expect(humanEscalationNode!.title).toBe("Human escalation");
  expect(humanEscalationNode!.description).toContain("Pause AI replies");
  expect(humanEscalationNode!.isReady).toBe(true);

  const withCloseConversation = await authed.mutation(api.workflows.addNodeAfter, {
    agentId,
    sourceNodeId: startNode!._id,
    kind: "closeConversation",
  });
  const closeConversationNode = withCloseConversation.nodes.find(
    (node) => node.kind === "closeConversation",
  );
  expect(closeConversationNode).toBeDefined();
  expect(closeConversationNode!.description).toBeUndefined();

  const edgePairs = withCloseConversation.edges.map((edge) => [
    edge.sourceNodeId,
    edge.targetNodeId,
  ]);
  expect(edgePairs).toContainEqual([startNode!._id, sendMessageNode!._id]);
  expect(edgePairs).toContainEqual([startNode!._id, bookAppointmentNode!._id]);
  expect(edgePairs).toContainEqual([startNode!._id, humanEscalationNode!._id]);
  expect(edgePairs).toContainEqual([startNode!._id, closeConversationNode!._id]);
  expect(
    withCloseConversation.edges.some((edge) => edge.sourceNodeId === sendMessageNode!._id),
  ).toBe(false);
});

test("a moved workflow node keeps its saved position when the graph reloads", async () => {
  const t = initTest();
  const workosUserId = "user-workflow-position";
  const { agentId } = await createPersonalAgent(t, workosUserId);
  const authed = t.withIdentity({ subject: workosUserId });
  const initial = await authed.mutation(api.workflows.ensureForAgent, { agentId });
  const created = await authed.mutation(api.workflows.addNodeAfter, {
    agentId,
    sourceNodeId: initial.nodes[0]._id,
    kind: "sendText",
  });
  const createdNode = created.nodes.find((node) => node.kind === "sendText");
  expect(createdNode).toBeDefined();

  await authed.mutation(api.workflows.updateNode, {
    agentId,
    nodeId: createdNode!._id,
    positionX: 480,
    positionY: 320,
  });

  const reloaded = await authed.query(api.workflows.getForAgent, { agentId });
  const reloadedNode = reloaded?.nodes.find(
    (node) => node._id === createdNode!._id,
  );
  expect(reloadedNode).toMatchObject({ positionX: 480, positionY: 320 });
});

test("removeEdge deletes a selected workflow edge", async () => {
  const t = initTest();
  const workosUserId = "user-workflow-remove-edge";
  const { agentId } = await createPersonalAgent(t, workosUserId);
  const authed = t.withIdentity({ subject: workosUserId });
  const graph = await authed.mutation(api.workflows.ensureForAgent, { agentId });
  const startNode = graph.nodes.find((node) => node.kind === "start");

  const withSendMessage = await authed.mutation(api.workflows.addNodeAfter, {
    agentId,
    sourceNodeId: startNode!._id,
    kind: "sendText",
  });
  const sendMessageEdge = withSendMessage.edges.find(
    (edge) => edge.sourceNodeId === startNode!._id,
  );
  expect(sendMessageEdge).toBeDefined();

  const afterRemove = await authed.mutation(api.workflows.removeEdge, {
    agentId,
    edgeId: sendMessageEdge!._id,
  });

  expect(afterRemove.edges.some((edge) => edge._id === sendMessageEdge!._id)).toBe(false);
  expect(afterRemove.edges).toHaveLength(withSendMessage.edges.length - 1);
});

test("workflow APIs reject cross-org access", async () => {
  const t = initTest();
  const now = Date.now();
  const agentId = await t.run(async (ctx) => {
    const ownerUserId = await ctx.db.insert("users", {
      workosUserId: "org-owner",
      email: "owner@example.com",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("teams", {
      type: "organizational",
      name: "Org A",
      ownerId: ownerUserId,
      workosOrgId: "org-a",
      createdAt: now,
      updatedAt: now,
    });
    return await ctx.db.insert("agents", {
      name: "Org Agent",
      provider: "openrouter",
      model: "deepseek/deepseek-v4-flash",
      systemPrompt: "Org prompt",
      templateKey: "blank",
      fileSize: 0,
      userId: "org-owner",
      orgId: "org-a",
      createdAt: now,
      updatedAt: now,
    });
  });

  await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      workosUserId: "org-outsider",
      email: "outsider@example.com",
      createdAt: now,
      updatedAt: now,
    });
    const teamId = await ctx.db.insert("teams", {
      type: "organizational",
      name: "Org B",
      ownerId: userId,
      workosOrgId: "org-b",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("teamMemberships", {
      teamId,
      userId,
      role: "admin",
      createdAt: now,
    });
    await ctx.db.patch(userId, { activeTeamId: teamId, updatedAt: now });
  });

  const outsider = t.withIdentity({
    subject: "org-outsider",
    permissions: [Permission.AGENTS_MANAGE],
  });

  await expect(
    outsider.mutation(api.workflows.ensureForAgent, {
      agentId: agentId as Id<"agents">,
    }),
  ).rejects.toThrow("Agent not found");
});
