import type { WorkflowAutomationMessageMetadata } from '../../shared/workflowAutomationMessage';

export function resolveWorkflowAutomationSource(
  agentMetadata: WorkflowAutomationMessageMetadata,
  ledgerMetadata: WorkflowAutomationMessageMetadata | undefined,
) {
  return agentMetadata.workflowAutomationSource ?? ledgerMetadata?.workflowAutomationSource;
}
