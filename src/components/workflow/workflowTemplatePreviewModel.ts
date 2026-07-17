import type { WorkflowGraph } from "./workflowTypes";
import {
  createWorkflowGraphFromTemplate,
  type WorkflowTemplate,
} from "./workflowTemplates";

export type WorkflowTemplatePreview = {
  template: WorkflowTemplate;
  graph: WorkflowGraph;
};

export function createWorkflowTemplatePreview(
  currentGraph: WorkflowGraph,
  template: WorkflowTemplate,
): WorkflowTemplatePreview {
  return {
    template,
    graph: createWorkflowGraphFromTemplate(currentGraph, template),
  };
}
