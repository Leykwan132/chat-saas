/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
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
    await ctx.db.insert("teamMemberships", { teamId, userId, role: "owner", createdAt: now });
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

test("removeNode preserves child condition when bridging around deleted node", async () => {
  const t = initTest();
  const workosUserId = "user-workflow-delete-bridge";
  const { agentId } = await createPersonalAgent(t, workosUserId);
  const authed = t.withIdentity({ subject: workosUserId });
  const graph = await authed.mutation(api.workflows.ensureForAgent, { agentId });
  const startNode = graph.nodes.find((node) => node.kind === "start");

  const withMessage = await authed.mutation(api.workflows.addNodeAfter, {
    agentId,
    sourceNodeId: startNode!._id,
    kind: "sendText",
  });
  const messageNode = withMessage.nodes.find((node) => node.kind === "sendText");
  const withBooking = await authed.mutation(api.workflows.addNodeAfter, {
    agentId,
    sourceNodeId: messageNode!._id,
    kind: "bookAppointment",
  });
  const bookingNode = withBooking.nodes.find((node) => node.kind === "bookAppointment");
  const bookingEdge = withBooking.edges.find(
    (edge) =>
      edge.sourceNodeId === messageNode!._id &&
      edge.targetNodeId === bookingNode!._id,
  );

  await authed.mutation(api.workflows.updateEdgeCondition, {
    agentId,
    edgeId: bookingEdge!._id,
    label: "Ready for appointment",
    detail: "Customer picked a service and wants a slot",
  });

  const afterRemove = await authed.mutation(api.workflows.removeNode, {
    agentId,
    nodeId: messageNode!._id,
  });
  const bridgedEdge = afterRemove.edges.find(
    (edge) =>
      edge.sourceNodeId === startNode!._id &&
      edge.targetNodeId === bookingNode!._id,
  );

  expect(afterRemove.nodes.some((node) => node._id === messageNode!._id)).toBe(false);
  expect(bridgedEdge?.label).toBe("Ready for appointment");
  expect(bridgedEdge?.detail).toBe("Customer picked a service and wants a slot");
});

test("removeNode rejects protected entry nodes", async () => {
  const t = initTest();
  const workosUserId = "user-workflow-delete-protected";
  const { agentId } = await createPersonalAgent(t, workosUserId);
  const authed = t.withIdentity({ subject: workosUserId });
  const graph = await authed.mutation(api.workflows.ensureForAgent, { agentId });
  const startNode = graph.nodes.find((node) => node.kind === "start");

  await expect(
    authed.mutation(api.workflows.removeNode, {
      agentId,
      nodeId: startNode!._id,
    }),
  ).rejects.toThrow("Cannot remove entry or end nodes");
});
