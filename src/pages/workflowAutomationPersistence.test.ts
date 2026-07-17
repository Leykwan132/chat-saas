import { expect, test } from "vitest";
import { WORKFLOW_TEMPLATES } from "../components/workflow/workflowTemplates";
import { toWorkflowAutomationSavePayload } from "./workflowAutomationPersistence";

test("builds an automation-only save payload from the latest graph timestamp", () => {
  const graph = WORKFLOW_TEMPLATES[0].graph;
  const automations = {
    ...graph.automations,
    followUp: {
      ...graph.automations.followUp,
      maxAttempts: 2,
    },
  };

  expect(toWorkflowAutomationSavePayload(graph, automations)).toEqual({
    baselineUpdatedAt: graph.workflow.updatedAt,
    automations,
  });
});
