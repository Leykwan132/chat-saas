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
