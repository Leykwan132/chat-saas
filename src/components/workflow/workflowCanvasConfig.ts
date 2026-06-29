import { WorkflowAutomationNode } from './WorkflowAutomationNode';
import { WorkflowAutomationStepNode } from './WorkflowAutomationStepNode';
import { WorkflowTriggerBackdropNode } from './WorkflowBackground';
import { WorkflowEdge } from './WorkflowEdge';
import { WorkflowFollowupGuidesNode } from './WorkflowFollowupGuides';
import { WorkflowFollowupSetupNode } from './WorkflowFollowupSetupNode';
import { WorkflowFollowupSummaryNode } from './WorkflowFollowupSummaryNode';
import { WorkflowNode } from './WorkflowNode';
import { WorkflowReminderSetupNode } from './WorkflowReminderSetupNode';
import { WorkflowReminderSummaryNode } from './WorkflowReminderSummaryNode';

export const workflowCanvasNodeTypes = {
  workflow: WorkflowNode,
  workflowAutomation: WorkflowAutomationNode,
  workflowAutomationStep: WorkflowAutomationStepNode,
  workflowFollowupGuides: WorkflowFollowupGuidesNode,
  workflowFollowupSetup: WorkflowFollowupSetupNode,
  workflowFollowupSummary: WorkflowFollowupSummaryNode,
  workflowReminderSetup: WorkflowReminderSetupNode,
  workflowReminderSummary: WorkflowReminderSummaryNode,
  workflowTriggerBackdrop: WorkflowTriggerBackdropNode,
};

export const workflowCanvasEdgeTypes = {
  workflow: WorkflowEdge,
};
