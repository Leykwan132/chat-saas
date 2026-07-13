export const WORKFLOW_AUTOMATION_MESSAGE_REQUIRED_ERROR =
  'You need to select a message first.';

export function resolveWorkflowAutomationEnabledChange(
  nextEnabled: boolean,
  messageSelected: boolean,
) {
  if (nextEnabled && !messageSelected) {
    return { enabled: false, messageRequired: true };
  }
  return { enabled: nextEnabled, messageRequired: false };
}
