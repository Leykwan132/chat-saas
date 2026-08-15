import { getWorkflowCleanupPositions } from "../components/workflow/workflowLayout";
import type {
  WorkflowGraph,
  WorkflowLayoutOrientation,
} from "../components/workflow/workflowTypes";
import type { WorkflowLayoutNodeMeasurements } from "../components/workflow/workflowLayoutMeasurements";

export function toWorkflowLayoutApplyArgs(
  graph: WorkflowGraph,
  layoutOrientation: WorkflowLayoutOrientation,
  measurements?: WorkflowLayoutNodeMeasurements,
) {
  return {
    layoutOrientation,
    positions: getWorkflowCleanupPositions(graph, layoutOrientation, measurements).map(
      ({ nodeId, position }) => ({
        nodeId,
        positionX: position.x,
        positionY: position.y,
      }),
    ),
  };
}
