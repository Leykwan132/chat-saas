import type { WorkflowAutomationConfigs } from "../../shared/workflowAutomations";
import type { WorkflowGraph } from "../components/workflow/workflowTypes";

export function toWorkflowAutomationSavePayload(
  graph: WorkflowGraph,
  automations: WorkflowAutomationConfigs,
) {
  return {
    baselineUpdatedAt: graph.workflow.updatedAt,
    automations,
  };
}
