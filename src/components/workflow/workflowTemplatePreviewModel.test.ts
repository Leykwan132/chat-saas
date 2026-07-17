import { expect, test } from "vitest";
import { WORKFLOW_TEMPLATES } from "./workflowTemplates";
import { createWorkflowTemplatePreview } from "./workflowTemplatePreviewModel";

test("builds an immutable template preview that preserves automations", () => {
  const currentGraph = WORKFLOW_TEMPLATES[0].graph;
  const template = WORKFLOW_TEMPLATES[1];
  const originalNodes = structuredClone(currentGraph.nodes);
  const preview = createWorkflowTemplatePreview(currentGraph, template);

  expect(preview.template).toBe(template);
  expect(preview.graph.workflow._id).toBe(currentGraph.workflow._id);
  expect(preview.graph.nodes.map((node) => node.kind)).toEqual(
    template.graph.nodes.map((node) => node.kind),
  );
  expect(preview.graph.automations).toEqual(currentGraph.automations);
  expect(currentGraph.nodes).toEqual(originalNodes);
});
