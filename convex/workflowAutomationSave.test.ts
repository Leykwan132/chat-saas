/// <reference types="vite/client" />
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import {
  createWorkflowPersistenceAgent,
  initWorkflowPersistenceTest,
} from "./workflowPersistence.testHelpers";

test("saves automations without changing the message graph or layout", async () => {
  const testClient = initWorkflowPersistenceTest();
  const workosUserId = "workflow-automation-save";
  const agentId = await createWorkflowPersistenceAgent(
    testClient,
    workosUserId,
  );
  const authed = testClient.withIdentity({ subject: workosUserId });
  const initial = await authed.mutation(api.workflows.ensureForAgent, { agentId });
  const withMessage = await authed.mutation(api.workflows.addNodeAfter, {
    agentId,
    sourceNodeId: initial.nodes[0]._id,
    kind: "sendText",
  });
  const automations = {
    ...withMessage.automations,
    followUp: {
      ...withMessage.automations.followUp,
      maxAttempts: 2,
    },
  };

  const saved = await authed.mutation(api.workflowAutomationSave.save, {
    agentId,
    baselineUpdatedAt: withMessage.workflow.updatedAt,
    automations,
  });

  expect(saved.nodes).toEqual(withMessage.nodes);
  expect(saved.edges).toEqual(withMessage.edges);
  expect(saved.workflow.layoutOrientation).toBe(
    withMessage.workflow.layoutOrientation,
  );
  expect(saved.automations.followUp.maxAttempts).toBe(2);
  expect(saved.automations.followUp.revision).toBe(
    withMessage.automations.followUp.revision + 1,
  );
});
