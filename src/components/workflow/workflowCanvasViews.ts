import { BellRing, MessageCircle, Repeat2, type LucideIcon } from 'lucide-react';
import {
  AUTOMATION_WORKFLOW_EDGE_PREFIX,
  type WorkflowFlowEdge,
  type WorkflowFlowNode,
} from './workflowTypes';

export type WorkflowCanvasView = 'messageHandling' | 'reminders' | 'followups';

export const workflowCanvasViewOptions = [
  {
    id: 'messageHandling',
    label: 'Direct Message',
    Icon: MessageCircle,
  },
  {
    id: 'reminders',
    label: 'Reminders',
    Icon: BellRing,
  },
  {
    id: 'followups',
    label: 'Followups',
    Icon: Repeat2,
  },
] satisfies Array<{
  id: WorkflowCanvasView;
  label: string;
  Icon: LucideIcon;
}>;

function isAutomationNodeForView(
  node: WorkflowFlowNode,
  view: Exclude<WorkflowCanvasView, 'messageHandling'>,
) {
  if (node.type === 'workflowTriggerBackdrop') {
    return node.data.kind === view;
  }

  if (
    node.type === 'workflowAutomation' ||
    node.type === 'workflowAutomationStep' ||
    node.type === 'workflowFollowupGuides' ||
    node.type === 'workflowFollowupSetup' ||
    node.type === 'workflowFollowupSummary' ||
    node.type === 'workflowReminderSetup' ||
    node.type === 'workflowReminderSummary'
  ) {
    return node.data.kind === view;
  }

  return false;
}

function isAutomationEdgeForView(
  edge: WorkflowFlowEdge,
  view: Exclude<WorkflowCanvasView, 'messageHandling'>,
) {
  return edge.id.startsWith(`${AUTOMATION_WORKFLOW_EDGE_PREFIX}${view}:`);
}

export function getWorkflowCanvasViewElements(
  nodes: WorkflowFlowNode[],
  edges: WorkflowFlowEdge[],
  view: WorkflowCanvasView,
) {
  if (view === 'messageHandling') {
    return {
      nodes: nodes.filter((node) => node.type === 'workflow'),
      edges: edges.filter((edge) => !edge.id.startsWith(AUTOMATION_WORKFLOW_EDGE_PREFIX)),
    };
  }

  return {
    nodes: nodes.filter((node) => isAutomationNodeForView(node, view)),
    edges: edges.filter((edge) => isAutomationEdgeForView(edge, view)),
  };
}
