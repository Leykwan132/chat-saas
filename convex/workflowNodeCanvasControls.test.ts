/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";
import stripeSchema from "../node_modules/@convex-dev/stripe/dist/component/schema.js";

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
    return await ctx.db.insert("agents", {
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
  });
}

async function createWorkflowNode(
  t: ReturnType<typeof initTest>,
  workosUserId: string,
  kind: "sendText" | "humanEscalation",
) {
  const agentId = await createPersonalAgent(t, workosUserId);
  const authed = t.withIdentity({ subject: workosUserId });
  const initialGraph = await authed.mutation(api.workflows.ensureForAgent, { agentId });
  const startNode = initialGraph.nodes.find((node) => node.kind === "start")!;
  const graph = await authed.mutation(api.workflows.addNodeAfter, {
    agentId,
    sourceNodeId: startNode._id,
    kind,
  });
  const node = graph.nodes.find((entry) => entry.kind === kind)!;
  const incomingEdge = graph.edges.find((edge) => edge.targetNodeId === node._id)!;
  return { agentId, authed, node, incomingEdge };
}

test("updates a Send message node and refreshes its readiness", async () => {
  const t = initTest();
  const { agentId, authed, node } = await createWorkflowNode(
    t,
    "workflow-canvas-message",
    "sendText",
  );

  await authed.mutation(api.workflowNodeCanvasControls.updateMessage, {
    agentId,
    nodeId: node._id,
    description: "  Share the booking link.  ",
  });

  const savedNode = await t.run(async (ctx) => await ctx.db.get(node._id));
  expect(savedNode).toMatchObject({
    description: "Share the booking link.",
    isReady: true,
    readinessIssueCount: 0,
  });
});

test("updates the incoming When condition for Human escalation", async () => {
  const t = initTest();
  const { agentId, authed, node, incomingEdge } = await createWorkflowNode(
    t,
    "workflow-canvas-escalation",
    "humanEscalation",
  );

  await authed.mutation(api.workflowNodeCanvasControls.updateIncomingCondition, {
    agentId,
    nodeId: node._id,
    conditionDetail: "  When the customer asks for a person.  ",
  });

  const savedEdge = await t.run(async (ctx) => await ctx.db.get(incomingEdge._id));
  expect(savedEdge?.detail).toBe("When the customer asks for a person.");
});

test("rejects canvas controls on an incompatible node kind", async () => {
  const t = initTest();
  const { agentId, authed, node } = await createWorkflowNode(
    t,
    "workflow-canvas-rejection",
    "sendText",
  );

  await expect(
    authed.mutation(api.workflowNodeCanvasControls.updateIncomingCondition, {
      agentId,
      nodeId: node._id as Id<"workflowNodes">,
      conditionDetail: "When requested.",
    }),
  ).rejects.toThrow("Human escalation");
});
