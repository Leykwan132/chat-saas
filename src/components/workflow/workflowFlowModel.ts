import { MarkerType } from '@xyflow/react';
import type { Id } from '../../../convex/_generated/dataModel';
import {
  workflowConditionDisplayLabel,
  workflowNodeDisplayTitle,
  type AddableWorkflowNodeKind,
} from '../../../shared/workflows';
import {
  type WorkflowFollowupGuidesFlowNode,
  type WorkflowFollowupSetupFlowNode,
  type WorkflowFollowupSummaryFlowNode,
  type WorkflowFlowEdge,
  type WorkflowFlowNode,
  type WorkflowGraph,
  type WorkflowReminderSetupFlowNode,
  type WorkflowReminderSummaryFlowNode,
} from './workflowTypes';
import { getWorkflowEdgeRoutes } from './workflowEdgeRouting';

const AUTOMATION_PANEL_X_OFFSET = 400;
const AUTOMATION_FLOW_TOP_PADDING = 24;
const AUTOMATION_SIDE_PANEL_GAP = 40;
const FOLLOWUP_SETUP_PANEL_WIDTH = 420;
const REMINDER_SETUP_PANEL_WIDTH = 400;
const FOLLOWUP_GUIDES_TOP = 408;

export const WORKFLOW_EDGE_Z_INDEX = 10;
export const WORKFLOW_NODE_Z_INDEX = 20;
export const WORKFLOW_SELECTED_NODE_Z_INDEX = 30;

function getAutomationFlowNodes(
  graph: WorkflowGraph,
): Array<
  WorkflowFollowupGuidesFlowNode |
  WorkflowFollowupSetupFlowNode |
  WorkflowFollowupSummaryFlowNode |
  WorkflowReminderSetupFlowNode |
  WorkflowReminderSummaryFlowNode
> {
  const startNode = graph.nodes.find((node) => node.kind === 'start');
  if (!startNode) return [];

  const nodeY = startNode.positionY;
  const setupPanelX = startNode.positionX + AUTOMATION_PANEL_X_OFFSET;
  const reminderSidePanelX = (
    setupPanelX +
    REMINDER_SETUP_PANEL_WIDTH +
    AUTOMATION_SIDE_PANEL_GAP
  );
  const followupSidePanelX = (
    setupPanelX +
    FOLLOWUP_SETUP_PANEL_WIDTH +
    AUTOMATION_SIDE_PANEL_GAP
  );
  const panelY = nodeY - AUTOMATION_FLOW_TOP_PADDING;
  const reminderSetupNode: WorkflowReminderSetupFlowNode = {
    id: 'workflow-automation-reminders',
    type: 'workflowReminderSetup',
    position: {
      x: setupPanelX,
      y: panelY,
    },
    draggable: true,
    selectable: false,
    connectable: false,
    data: {
      kind: 'reminders',
      title: 'Reminders',
    },
    zIndex: WORKFLOW_NODE_Z_INDEX,
  };
  const reminderSummaryNode: WorkflowReminderSummaryFlowNode = {
    id: 'workflow-automation-reminders-summary',
    type: 'workflowReminderSummary',
    position: {
      x: reminderSidePanelX,
      y: panelY,
    },
    draggable: false,
    selectable: false,
    connectable: false,
    data: {
      kind: 'reminders',
      title: 'Summary',
    },
    zIndex: WORKFLOW_NODE_Z_INDEX,
  };
  const followupSetupNode: WorkflowFollowupSetupFlowNode = {
    id: 'workflow-automation-followups',
    type: 'workflowFollowupSetup',
    position: {
      x: setupPanelX,
      y: panelY,
    },
    draggable: true,
    selectable: false,
    connectable: false,
    data: {
      kind: 'followups',
      title: 'Follow-up',
    },
    zIndex: WORKFLOW_NODE_Z_INDEX,
  };
  const followupSummaryNode: WorkflowFollowupSummaryFlowNode = {
    id: 'workflow-automation-followups-summary',
    type: 'workflowFollowupSummary',
    position: {
      x: followupSidePanelX,
      y: panelY,
    },
    draggable: false,
    selectable: false,
    connectable: false,
    data: {
      kind: 'followups',
      title: 'Summary',
    },
    zIndex: WORKFLOW_NODE_Z_INDEX,
  };
  const followupGuidesNode: WorkflowFollowupGuidesFlowNode = {
    id: 'workflow-automation-followups-guides',
    type: 'workflowFollowupGuides',
    position: {
      x: followupSidePanelX,
      y: panelY + FOLLOWUP_GUIDES_TOP,
    },
    draggable: false,
    selectable: false,
    connectable: false,
    data: {
      kind: 'followups',
    },
    zIndex: WORKFLOW_NODE_Z_INDEX,
  };

  return [
    reminderSetupNode,
    reminderSummaryNode,
    followupSetupNode,
    followupSummaryNode,
    followupGuidesNode,
  ];
}

function getAutomationFlowEdges(): WorkflowFlowEdge[] {
  return [];
}

export function workflowGraphToFlow(
  graph: WorkflowGraph,
  onAddNode: (nodeId: Id<'workflowNodes'>, kind: AddableWorkflowNodeKind) => void,
  onRemoveNode: (nodeId: Id<'workflowNodes'>) => void,
  selectedNodeId?: Id<'workflowNodes'>,
): { nodes: WorkflowFlowNode[]; edges: WorkflowFlowEdge[] } {
  const edgeRoutes = getWorkflowEdgeRoutes(graph);

  return {
    nodes: [
      ...getAutomationFlowNodes(graph),
      ...graph.nodes.map((node) => ({
        id: node._id,
        type: 'workflow' as const,
        position: {
          x: node.positionX,
          y: node.positionY,
        },
        data: {
          nodeId: node._id,
          kind: node.kind,
          title: workflowNodeDisplayTitle(node.kind, node.title),
          description: node.description,
          onAddNode,
          onRemoveNode,
        },
        selected: node._id === selectedNodeId,
        zIndex: node._id === selectedNodeId
          ? WORKFLOW_SELECTED_NODE_Z_INDEX
          : WORKFLOW_NODE_Z_INDEX,
      })),
    ],
    edges: [
      ...graph.edges.map((edge) => {
        const conditionLabel = workflowConditionDisplayLabel(edge.label);
        return {
          id: edge._id,
          source: edge.sourceNodeId,
          target: edge.targetNodeId,
          type: 'workflow' as const,
          animated: true,
          label: conditionLabel,
          markerEnd: {
            type: MarkerType.ArrowClosed,
          },
          zIndex: WORKFLOW_EDGE_Z_INDEX,
          className: 'workflow-edge',
          data: {
            routePoints: edgeRoutes.get(edge._id),
          },
        };
      }),
      ...getAutomationFlowEdges(),
    ],
  };
}
