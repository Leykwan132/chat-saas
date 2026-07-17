import { expect, test } from "vitest";
import { WORKFLOW_TEMPLATES } from "../components/workflow/workflowTemplates";
import { toWorkflowTemplateReplacementPayload } from "./workflowTemplateReplacementPersistence";

test("builds a graph-only replacement payload with entirely new nodes", () => {
  const graph = WORKFLOW_TEMPLATES[0].graph;
  const payload = toWorkflowTemplateReplacementPayload(graph);

  expect(payload).not.toHaveProperty("automations");
  expect(
    payload.nodes.every((node) => !("persistedNodeId" in node)),
  ).toBe(true);
  expect(payload.baselineUpdatedAt).toBe(graph.workflow.updatedAt);
});
