import type { Id } from '../../convex/_generated/dataModel';
import type { AddableWorkflowNodeKind } from '../../shared/workflows';
import type { WorkflowGraph } from '@/components/workflow/workflowTypes';

export function findNewWorkflowNodeId(
  previousGraph: WorkflowGraph,
  nextGraph: WorkflowGraph,
  sourceNodeId: Id<'workflowNodes'>,
  kind: AddableWorkflowNodeKind,
) {
  const previousNodeIds = new Set(previousGraph.nodes.map((node) => node._id));
  const childNodeIds = new Set(
    nextGraph.edges
      .filter((edge) => edge.sourceNodeId === sourceNodeId)
      .map((edge) => edge.targetNodeId),
  );
  return [...nextGraph.nodes]
    .filter((node) => (
      node.kind === kind &&
      childNodeIds.has(node._id) &&
      !previousNodeIds.has(node._id)
    ))
    .sort((first, second) => second._creationTime - first._creationTime)[0]?._id;
}
