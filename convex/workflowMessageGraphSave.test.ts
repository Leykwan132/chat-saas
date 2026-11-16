/// <reference types="vite/client" />
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import {
  createWorkflowPersistenceAgent,
  initWorkflowPersistenceTest,
} from "./workflowPersistence.testHelpers";

test("replaces the message graph without changing automations", async () => {
  const testClient = initWorkflowPersistenceTest();
  const workosUserId = "workflow-message-graph-save";
  const agentId = await createWorkflowPersistenceAgent(
    testClient,
    workosUserId,
  );
  const authed = testClient.withIdentity({ subject: workosUserId });
  const initial = await authed.mutation(api.workflows.ensureForAgent, { agentId });
  const startNode = initial.nodes[0];

  const replaced = await authed.mutation(api.workflowMessageGraphSave.replace, {
    agentId,
    baselineUpdatedAt: initial.workflow.updatedAt,
    layoutOrientation: "horizontal",
    templateId: "real-estate",
    nodes: [
      {
        clientId: "replacement:start",
        kind: "start",
        title: "Message enters",
        positionX: 0,
        positionY: 0,
      },
      {
        clientId: "replacement:file",
        kind: "sendFile",
        title: "Send brochure",
        positionX: 300,
        positionY: 0,
      },
    ],
    edges: [
      {
        sourceClientId: "replacement:start",
        targetClientId: "replacement:file",
        label: "Brochure requested",
        detail: "When the customer requests the brochure",
      },
    ],
  });

  expect(replaced.automations).toEqual(initial.automations);
  expect(replaced.nodes.map((node) => node.kind).sort()).toEqual([
    "sendFile",
    "start",
  ]);
  expect(replaced.nodes.find((node) => node.kind === "start")?.isReady).toBe(true);
  expect(replaced.nodes.some((node) => node._id === startNode._id)).toBe(false);
  await testClient.run(async (ctx) => {
    const usage = await ctx.db.query("workflowTemplateUsage").take(10);
    expect(usage).toEqual([
      expect.objectContaining({
        agentId,
        templateId: "real-estate",
        saveCount: 1,
      }),
    ]);
  });

  await expect(
    authed.mutation(api.workflowMessageGraphSave.replace, {
      agentId,
      baselineUpdatedAt: initial.workflow.updatedAt,
      layoutOrientation: "horizontal",
      nodes: [],
      edges: [],
    }),
  ).rejects.toThrow("changed elsewhere");
});

test("replacing workflow nodes preserves escalation rules managed under Instructions", async () => {
  const t = initWorkflowPersistenceTest();
  const agentId = await createWorkflowPersistenceAgent(t, "preserve-escalation");
  const authed = t.withIdentity({ subject: "preserve-escalation" });
  const initial = await authed.mutation(api.workflows.ensureForAgent, { agentId });
  const graph = await authed.mutation(api.workflows.addNodeAfter, { agentId, sourceNodeId: initial.nodes[0]._id, kind: "humanEscalation" });
  const rule = graph.nodes.find((node) => node.kind === "humanEscalation")!;
  await authed.mutation(api.workflowEscalationKeywords.update, { agentId, nodeId: rule._id, enabled: true, keywords: ["human"] });
  const current = await authed.query(api.workflows.getForAgent, { agentId });
  const replaced = await authed.mutation(api.workflowMessageGraphSave.replace, {
    agentId, baselineUpdatedAt: current!.workflow.updatedAt, layoutOrientation: "horizontal",
    nodes: [{ clientId: "new-start", kind: "start", title: "Message enters", positionX: 0, positionY: 0 }], edges: [],
  });
  expect(replaced.nodes.find((node) => node._id === rule._id)).toMatchObject({ escalationKeywordsEnabled: true, escalationKeywords: ["human"] });
  const newStart = replaced.nodes.find((node) => node.kind === "start")!;
  expect(replaced.edges.find((edge) => edge.targetNodeId === rule._id)).toMatchObject({ sourceNodeId: newStart._id, detail: graph.edges[0].detail });
});

test("template replacement consolidates multiple removed parents without losing escalation conditions", async () => {
  const t = initWorkflowPersistenceTest();
  const agentId = await createWorkflowPersistenceAgent(t, "preserve-multiple-escalation-parents");
  const authed = t.withIdentity({ subject: "preserve-multiple-escalation-parents" });
  const initial = await authed.mutation(api.workflows.ensureForAgent, { agentId });
  const withRule = await authed.mutation(api.workflows.addNodeAfter, { agentId, sourceNodeId: initial.nodes[0]._id, kind: "humanEscalation" });
  const rule = withRule.nodes.find((node) => node.kind === "humanEscalation")!;
  const withMessage = await authed.mutation(api.workflows.addNodeAfter, { agentId, sourceNodeId: initial.nodes[0]._id, kind: "sendText" });
  const message = withMessage.nodes.find((node) => node.kind === "sendText")!;
  const connected = await authed.mutation(api.workflows.connectNodes, { agentId, sourceNodeId: message._id, targetNodeId: rule._id });
  const branch = connected.edges.find((edge) => edge.sourceNodeId === message._id && edge.targetNodeId === rule._id)!;
  await authed.mutation(api.workflows.updateEdgeCondition, { agentId, edgeId: branch._id, label: "Urgent", detail: "Customer has an urgent issue" });
  const current = await authed.query(api.workflows.getForAgent, { agentId });
  const replaced = await authed.mutation(api.workflowMessageGraphSave.replace, {
    agentId, baselineUpdatedAt: current!.workflow.updatedAt, layoutOrientation: "horizontal",
    nodes: [{ clientId: "new-start", kind: "start", title: "Message enters", positionX: 0, positionY: 0 }], edges: [],
  });
  const conditions = replaced.edges.filter((edge) => edge.targetNodeId === rule._id);
  expect(conditions).toHaveLength(1);
  expect(conditions[0].detail).toContain("Customer has an urgent issue");
  expect(conditions[0].detail).toContain(withRule.edges[0].detail);
});
