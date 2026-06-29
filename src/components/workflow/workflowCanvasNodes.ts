import { isWorkflowTerminalNodeKind } from '../../../shared/workflows';
import type {
  WorkflowFlowNode,
  WorkflowPersistedFlowNode,
} from './workflowTypes';

export function isPersistedWorkflowFlowNode(
  node: WorkflowFlowNode,
): node is WorkflowPersistedFlowNode {
  return node.type === 'workflow';
}

export function findPersistedWorkflowFlowNode(
  nodes: WorkflowFlowNode[],
  nodeId: string | null,
): WorkflowPersistedFlowNode | undefined {
  const node = nodes.find((candidate) => candidate.id === nodeId);
  if (!node || !isPersistedWorkflowFlowNode(node)) return undefined;
  return node;
}

export function canConnectWorkflowFlowNodes(
  sourceNode: WorkflowPersistedFlowNode,
  targetNode: WorkflowPersistedFlowNode,
) {
  return !isWorkflowTerminalNodeKind(sourceNode.data.kind) &&
    targetNode.data.kind !== 'start';
}
