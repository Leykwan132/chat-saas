export type WorkflowAutomationSource = 'workflowReminder' | 'workflowFollowUp';

export type WorkflowAutomationMessageMetadata = {
  workflowAutomationSource?: WorkflowAutomationSource;
};
