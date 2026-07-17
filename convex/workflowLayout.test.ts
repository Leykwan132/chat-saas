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

async function createPersonalAgent(t: ReturnType<typeof initTest>, workosUserId: string) {
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

test("updateOrientation stores the workflow layout orientation", async () => {
  const t = initTest();
  const workosUserId = "user-workflow-layout";
  const { agentId } = await createPersonalAgent(t, workosUserId);
  const authed = t.withIdentity({ subject: workosUserId });

  const initialGraph = await authed.mutation(api.workflows.ensureForAgent, { agentId });
  expect(initialGraph.workflow.layoutOrientation).toBeUndefined();

  const updatedGraph = await authed.mutation(api.workflowLayout.updateOrientation, {
    agentId,
    layoutOrientation: "vertical",
  });
  const reloadedGraph = await authed.query(api.workflows.getForAgent, { agentId });

  expect(updatedGraph.workflow.layoutOrientation).toBe("vertical");
  expect(reloadedGraph?.workflow.layoutOrientation).toBe("vertical");
});

test("apply stores every canonical position without changing automations", async () => {
  const t = initTest();
  const workosUserId = "user-workflow-layout-apply";
  const { agentId } = await createPersonalAgent(t, workosUserId);
  const authed = t.withIdentity({ subject: workosUserId });
  const initial = await authed.mutation(api.workflows.ensureForAgent, { agentId });
  const graph = await authed.mutation(api.workflows.addNodeAfter, {
    agentId,
    sourceNodeId: initial.nodes[0]._id,
    kind: "sendText",
  });
  const positions = graph.nodes.map((node, index) => ({
    nodeId: node._id,
    positionX: index * 100,
    positionY: index * 200,
  }));

  const arranged = await authed.mutation(api.workflowLayout.apply, {
    agentId,
    layoutOrientation: "vertical",
    positions,
  });

  expect(arranged.workflow.layoutOrientation).toBe("vertical");
  expect(arranged.automations).toEqual(graph.automations);
  expect(
    arranged.nodes.map((node) => ({
      nodeId: node._id,
      positionX: node.positionX,
      positionY: node.positionY,
    })),
  ).toEqual(positions);
});

test("apply rejects duplicate node positions without partially moving nodes", async () => {
  const t = initTest();
  const workosUserId = "user-workflow-layout-duplicates";
  const { agentId } = await createPersonalAgent(t, workosUserId);
  const authed = t.withIdentity({ subject: workosUserId });
  const initial = await authed.mutation(api.workflows.ensureForAgent, { agentId });
  const graph = await authed.mutation(api.workflows.addNodeAfter, {
    agentId,
    sourceNodeId: initial.nodes[0]._id,
    kind: "sendText",
  });
  const firstNode = graph.nodes[0];

  await expect(
    authed.mutation(api.workflowLayout.apply, {
      agentId,
      layoutOrientation: "vertical",
      positions: graph.nodes.map(() => ({
        nodeId: firstNode._id,
        positionX: 999,
        positionY: 999,
      })),
    }),
  ).rejects.toThrow("Workflow layout nodes do not match");

  const reloaded = await authed.query(api.workflows.getForAgent, { agentId });
  expect(reloaded?.nodes).toEqual(graph.nodes);
});
