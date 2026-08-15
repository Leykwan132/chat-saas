import type { Id } from '../../../convex/_generated/dataModel';
import { isPersistedWorkflowFlowNode } from './workflowCanvasNodes';
import type { WorkflowFlowNode } from './workflowTypes';

export type WorkflowLayoutNodeMeasurements = ReadonlyMap<
  Id<'workflowNodes'>,
  { width: number; height: number }
>;

function hasMeasuredNodeSize(
  size: { width?: number; height?: number },
): size is { width: number; height: number } {
  return typeof size.width === 'number' &&
    typeof size.height === 'number' &&
    Number.isFinite(size.width) &&
    Number.isFinite(size.height) &&
    size.width > 0 &&
    size.height > 0;
}

export function getWorkflowLayoutNodeMeasurements(
  nodes: WorkflowFlowNode[],
): WorkflowLayoutNodeMeasurements {
  return new Map(nodes.flatMap((node) => {
    if (!isPersistedWorkflowFlowNode(node)) return [];
    const measuredSize = node.measured ?? {};
    if (!hasMeasuredNodeSize(measuredSize)) return [];
    return [[node.data.nodeId, measuredSize] as const];
  }));
}
