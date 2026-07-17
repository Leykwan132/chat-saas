import { getWorkflowCleanupPositions } from "../components/workflow/workflowLayout";
import type {
  WorkflowGraph,
  WorkflowLayoutOrientation,
} from "../components/workflow/workflowTypes";

export function toWorkflowLayoutApplyArgs(
  graph: WorkflowGraph,
  layoutOrientation: WorkflowLayoutOrientation,
) {
  return {
    layoutOrientation,
    positions: getWorkflowCleanupPositions(graph, layoutOrientation).map(
      ({ nodeId, position }) => ({
        nodeId,
        positionX: position.x,
        positionY: position.y,
      }),
    ),
  };
}
