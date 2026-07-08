import type { WorkflowCleanupPosition } from '@/components/workflow/workflowLayout';
import type { WorkflowGraph } from '@/components/workflow/workflowTypes';

export function getChangedWorkflowCleanupPositions(
  graph: WorkflowGraph,
  positions: WorkflowCleanupPosition[],
): WorkflowCleanupPosition[] {
  const nodeById = new Map(graph.nodes.map((node) => [node._id, node]));

  return positions.filter(({ nodeId, position }) => {
    const node = nodeById.get(nodeId);
    return Boolean(
      node &&
        (Math.abs(node.positionX - position.x) >= 1 ||
          Math.abs(node.positionY - position.y) >= 1),
    );
  });
}
