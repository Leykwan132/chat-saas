/// <reference types="vite/client" />
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import {
  createWorkflowPersistenceAgent,
  initWorkflowPersistenceTest,
} from "./workflowPersistence.testHelpers";

test("keeps the legacy combined workflow save endpoint available", async () => {
  const testClient = initWorkflowPersistenceTest();
  const workosUserId = "workflow-draft-save-compatibility";
  const agentId = await createWorkflowPersistenceAgent(
    testClient,
    workosUserId,
  );
  const authed = testClient.withIdentity({ subject: workosUserId });
  const initial = await authed.mutation(api.workflows.ensureForAgent, { agentId });
  const automations = {
    ...initial.automations,
    followUp: {
      ...initial.automations.followUp,
      maxAttempts: 2,
    },
  };

  const saved = await authed.mutation(api.workflowDraftSave.save, {
    agentId,
    baselineUpdatedAt: initial.workflow.updatedAt,
    layoutOrientation: "horizontal",
    templateId: "real-estate",
    nodes: [
      {
        clientId: "legacy:start",
        kind: "start",
        title: "Message enters",
        positionX: 0,
        positionY: 0,
      },
      {
        clientId: "legacy:text",
        kind: "sendText",
        title: "Send welcome",
        positionX: 300,
        positionY: 0,
      },
    ],
    edges: [
      {
        sourceClientId: "legacy:start",
        targetClientId: "legacy:text",
      },
    ],
    automations,
  });

  expect(saved.nodes.map((node) => node.kind).sort()).toEqual([
    "sendText",
    "start",
  ]);
  expect(saved.automations.followUp.maxAttempts).toBe(2);
  expect(saved.automations.followUp.revision).toBe(
    initial.automations.followUp.revision + 1,
  );
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
});
