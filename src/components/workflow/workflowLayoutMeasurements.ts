import type { Id } from '../../../convex/_generated/dataModel';
import { isPersistedWorkflowFlowNode } from './workflowCanvasNodes';
import type { WorkflowFlowNode } from './workflowTypes';

export type WorkflowLayoutNodeMeasurements = ReadonlyMap<
  Id<'workflowNodes'>,
  { width: number; height: number }
>;

export function getWorkflowLayoutNodeMeasurements(
  nodes: WorkflowFlowNode[],
): WorkflowLayoutNodeMeasurements {
  return new Map(nodes.flatMap((node) => {
    if (!isPersistedWorkflowFlowNode(node)) return [];
    const { width, height } = node.measured ?? {};
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      return [];
    }
    return [[node.data.nodeId, { width, height }] as const];
  }));
}
