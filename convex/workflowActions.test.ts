/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import stripeSchema from "../node_modules/@convex-dev/stripe/dist/component/schema.js";
import {
  ADDABLE_WORKFLOW_NODE_KINDS,
  workflowNodeDefaultCondition,
} from "../shared/workflows";

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
      createdAt: now,
      updatedAt: now,
    });
    return { agentId };
  });
}

test("plus actions create action nodes with expected default condition labels", async () => {
  const t = initTest();
  const workosUserId = "user-workflow-actions";
  const { agentId } = await createPersonalAgent(t, workosUserId);
  const authed = t.withIdentity({ subject: workosUserId });
  let graph = await authed.mutation(api.workflows.ensureForAgent, { agentId });
  const startNode = graph.nodes.find((node) => node.kind === "start");
  expect(startNode).toBeDefined();
  expect(ADDABLE_WORKFLOW_NODE_KINDS).toEqual([
    "answerQuestions",
    "updateLeadsStatus",
    "bookAppointment",
    "aiResponds",
    "closeConversation",
  ]);

  for (const kind of ADDABLE_WORKFLOW_NODE_KINDS) {
    graph = await authed.mutation(api.workflows.addNodeAfter, {
      agentId,
      sourceNodeId: startNode!._id,
      kind,
    });
    const actionNode = graph.nodes.find((node) => node.kind === kind);
    expect(actionNode).toBeDefined();
    const actionEdge = graph.edges.find(
      (edge) =>
        edge.sourceNodeId === startNode!._id &&
        edge.targetNodeId === actionNode!._id,
    );
    expect(actionEdge?.label).toBe(workflowNodeDefaultCondition(kind)?.label);
    expect(actionEdge?.detail).toBe(workflowNodeDefaultCondition(kind)?.detail);
    if (kind === "answerQuestions") {
      expect(actionNode!.title).toBe("Q&A");
      expect(actionNode!.description).toContain("knowledge base as the source of truth");
      expect(actionEdge?.label).toBe("Customer question");
      expect(actionEdge?.detail).toContain("answer using the knowledge base");
    }
  }
});

test("connectNodes creates edges without default condition labels", async () => {
  const t = initTest();
  const workosUserId = "user-workflow-connect-label";
  const { agentId } = await createPersonalAgent(t, workosUserId);
  const authed = t.withIdentity({ subject: workosUserId });
  const graph = await authed.mutation(api.workflows.ensureForAgent, { agentId });
  const startNode = graph.nodes.find((node) => node.kind === "start");

  const withQualifiedLeads = await authed.mutation(api.workflows.addNodeAfter, {
    agentId,
    sourceNodeId: startNode!._id,
    kind: "updateLeadsStatus",
  });
  const qualifiedLeadsNode = withQualifiedLeads.nodes.find(
    (node) => node.kind === "updateLeadsStatus",
  );
  const withBookAppointment = await authed.mutation(api.workflows.addNodeAfter, {
    agentId,
    sourceNodeId: startNode!._id,
    kind: "bookAppointment",
  });
  const bookAppointmentNode = withBookAppointment.nodes.find(
    (node) => node.kind === "bookAppointment",
  );

  const connected = await authed.mutation(api.workflows.connectNodes, {
    agentId,
    sourceNodeId: qualifiedLeadsNode!._id,
    targetNodeId: bookAppointmentNode!._id,
  });
  const connectedEdge = connected.edges.find(
    (edge) =>
      edge.sourceNodeId === qualifiedLeadsNode!._id &&
      edge.targetNodeId === bookAppointmentNode!._id,
  );
  expect(connectedEdge?.label).toBeUndefined();
});

test("updateEdgeCondition sets and clears condition labels", async () => {
  const t = initTest();
  const workosUserId = "user-workflow-condition-label";
  const { agentId } = await createPersonalAgent(t, workosUserId);
  const authed = t.withIdentity({ subject: workosUserId });
  const graph = await authed.mutation(api.workflows.ensureForAgent, { agentId });
  const startNode = graph.nodes.find((node) => node.kind === "start");
  expect(startNode).toBeDefined();

  const withQualifiedLeads = await authed.mutation(api.workflows.addNodeAfter, {
    agentId,
    sourceNodeId: startNode!._id,
    kind: "updateLeadsStatus",
  });
  const edge = withQualifiedLeads.edges.find(
    (candidate) => candidate.sourceNodeId === startNode!._id,
  );
  expect(edge).toBeDefined();

  const updated = await authed.mutation(api.workflows.updateEdgeCondition, {
    agentId,
    edgeId: edge!._id,
    label: "  Customer asks about pricing  ",
    detail: "  Use this when the customer wants pricing details  ",
  });
  expect(updated.edges.find((candidate) => candidate._id === edge!._id)?.label).toBe(
    "Customer asks about pricing",
  );
  expect(updated.edges.find((candidate) => candidate._id === edge!._id)?.detail).toBe(
    "Use this when the customer wants pricing details",
  );

  const cleared = await authed.mutation(api.workflows.updateEdgeCondition, {
    agentId,
    edgeId: edge!._id,
    label: "   ",
    detail: "   ",
  });
  expect(cleared.edges.find((candidate) => candidate._id === edge!._id)?.label).toBeUndefined();
  expect(cleared.edges.find((candidate) => candidate._id === edge!._id)?.detail).toBeUndefined();
});

test("resetForAgent clears workflow graph back to the entry node", async () => {
  const t = initTest();
  const workosUserId = "user-workflow-reset";
  const { agentId } = await createPersonalAgent(t, workosUserId);
  const authed = t.withIdentity({ subject: workosUserId });
  const graph = await authed.mutation(api.workflows.ensureForAgent, { agentId });
  const startNode = graph.nodes.find((node) => node.kind === "start");
  expect(startNode).toBeDefined();

  const withQualifiedLeads = await authed.mutation(api.workflows.addNodeAfter, {
    agentId,
    sourceNodeId: startNode!._id,
    kind: "updateLeadsStatus",
  });
  const qualifiedLeadsNode = withQualifiedLeads.nodes.find(
    (node) => node.kind === "updateLeadsStatus",
  );
  expect(qualifiedLeadsNode).toBeDefined();

  await authed.mutation(api.workflows.addNodeAfter, {
    agentId,
    sourceNodeId: qualifiedLeadsNode!._id,
    kind: "closeConversation",
  });
  await authed.mutation(api.workflows.updateNode, {
    agentId,
    nodeId: startNode!._id,
    positionX: 220,
    positionY: 140,
  });

  const reset = await authed.mutation(api.workflowReset.resetForAgent, { agentId });

  expect(reset.nodes.map((node) => node.kind)).toEqual(["start"]);
  expect(reset.nodes[0].title).toBe("Message enters");
  expect(reset.nodes[0].positionX).toBe(0);
  expect(reset.nodes[0].positionY).toBe(0);
  expect(reset.edges).toHaveLength(0);
});

test("close conversation nodes cannot create outgoing edges", async () => {
  const t = initTest();
  const workosUserId = "user-workflow-close-terminal";
  const { agentId } = await createPersonalAgent(t, workosUserId);
  const authed = t.withIdentity({ subject: workosUserId });
  const graph = await authed.mutation(api.workflows.ensureForAgent, { agentId });
  const startNode = graph.nodes.find((node) => node.kind === "start");

  const withCloseConversation = await authed.mutation(api.workflows.addNodeAfter, {
    agentId,
    sourceNodeId: startNode!._id,
    kind: "closeConversation",
  });
  const closeConversationNode = withCloseConversation.nodes.find(
    (node) => node.kind === "closeConversation",
  );
  const withQualifiedLeads = await authed.mutation(api.workflows.addNodeAfter, {
    agentId,
    sourceNodeId: startNode!._id,
    kind: "updateLeadsStatus",
  });
  const qualifiedLeadsNode = withQualifiedLeads.nodes.find(
    (node) => node.kind === "updateLeadsStatus",
  );

  await expect(
    authed.mutation(api.workflows.addNodeAfter, {
      agentId,
      sourceNodeId: closeConversationNode!._id,
      kind: "bookAppointment",
    }),
  ).rejects.toThrow("Cannot add a node after a terminal node");

  await expect(
    authed.mutation(api.workflows.connectNodes, {
      agentId,
      sourceNodeId: closeConversationNode!._id,
      targetNodeId: qualifiedLeadsNode!._id,
    }),
  ).rejects.toThrow("Cannot connect from a terminal node");
});
