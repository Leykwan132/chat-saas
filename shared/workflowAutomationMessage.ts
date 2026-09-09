export type WorkflowAutomationSource =
  | 'workflowReminder'
  | 'workflowFollowUp'
  | 'commentAutomation';

export type WorkflowAutomationMessageMetadata = {
  workflowAutomationSource?: WorkflowAutomationSource;
};
