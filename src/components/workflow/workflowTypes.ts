import type { Edge, Node } from '@xyflow/react';
import type { Doc, Id } from '../../../convex/_generated/dataModel';
import type { AddableWorkflowNodeKind, WorkflowNodeKind } from '../../../shared/workflows';
import type { WorkflowAutomationStepKey } from './workflowTriggerOptions';
import type { WorkflowAutomationConfigs } from '../../../shared/workflowAutomations';

export const AUTOMATION_WORKFLOW_EDGE_PREFIX = 'automation:';

export type WorkflowGraph = {
  workflow: Doc<'workflows'>;
  nodes: Doc<'workflowNodes'>[];
  edges: Doc<'workflowEdges'>[];
  automations: WorkflowAutomationConfigs;
};

export type WorkflowLayoutOrientation = 'horizontal' | 'vertical';

export type WorkflowNodeData = Record<string, unknown> & {
  nodeId: Id<'workflowNodes'>;
  kind: WorkflowNodeKind;
  title: string;
  description?: string;
  layoutOrientation: WorkflowLayoutOrientation;
  onAddNode: (nodeId: Id<'workflowNodes'>, kind: AddableWorkflowNodeKind) => void;
  onRemoveNode: (nodeId: Id<'workflowNodes'>) => void;
};

export type WorkflowAutomationNodeKind = 'reminders' | 'followups';

export type WorkflowAutomationNodeData = Record<string, unknown> & {
  kind: WorkflowAutomationNodeKind;
  title: string;
};

export type WorkflowAutomationStepNodeData = Record<string, unknown> & {
  kind: WorkflowAutomationNodeKind;
  stepKey: WorkflowAutomationStepKey;
  defaultOptionId: string;
};

export type WorkflowFollowupSummaryNodeData = Record<string, unknown> & {
  kind: 'followups';
  title: string;
};

export type WorkflowFollowupGuidesNodeData = Record<string, unknown> & {
  kind: 'followups';
};

export type WorkflowFollowupSetupNodeData = Record<string, unknown> & {
  kind: 'followups';
  title: string;
};

export type WorkflowReminderSummaryNodeData = Record<string, unknown> & {
  kind: 'reminders';
  title: string;
};

export type WorkflowReminderSetupNodeData = Record<string, unknown> & {
  kind: 'reminders';
  title: string;
};

export type WorkflowTriggerBackdropNodeData = Record<string, unknown> & {
  kind: WorkflowAutomationNodeKind;
  width: number;
  height: number;
};

export type WorkflowEdgeData = Record<string, unknown> & {
  routePoints?: WorkflowEdgeRoutePoint[];
  onSelectTargetNode?: () => void;
  automation?: boolean;
};

export type WorkflowEdgeRoutePoint = {
  x: number;
  y: number;
};

export type WorkflowPersistedFlowNode = Node<WorkflowNodeData, 'workflow'>;
export type WorkflowAutomationFlowNode = Node<
  WorkflowAutomationNodeData,
  'workflowAutomation'
>;
export type WorkflowAutomationStepFlowNode = Node<
  WorkflowAutomationStepNodeData,
  'workflowAutomationStep'
>;
export type WorkflowFollowupSummaryFlowNode = Node<
  WorkflowFollowupSummaryNodeData,
  'workflowFollowupSummary'
>;
export type WorkflowFollowupGuidesFlowNode = Node<
  WorkflowFollowupGuidesNodeData,
  'workflowFollowupGuides'
>;
export type WorkflowFollowupSetupFlowNode = Node<
  WorkflowFollowupSetupNodeData,
  'workflowFollowupSetup'
>;
export type WorkflowReminderSummaryFlowNode = Node<
  WorkflowReminderSummaryNodeData,
  'workflowReminderSummary'
>;
export type WorkflowReminderSetupFlowNode = Node<
  WorkflowReminderSetupNodeData,
  'workflowReminderSetup'
>;
export type WorkflowTriggerBackdropFlowNode = Node<
  WorkflowTriggerBackdropNodeData,
  'workflowTriggerBackdrop'
>;
export type WorkflowFlowNode =
  | WorkflowPersistedFlowNode
  | WorkflowAutomationFlowNode
  | WorkflowAutomationStepFlowNode
  | WorkflowFollowupSummaryFlowNode
  | WorkflowFollowupGuidesFlowNode
  | WorkflowFollowupSetupFlowNode
  | WorkflowReminderSummaryFlowNode
  | WorkflowReminderSetupFlowNode
  | WorkflowTriggerBackdropFlowNode;
export type WorkflowFlowEdge = Edge<WorkflowEdgeData, 'workflow'>;
