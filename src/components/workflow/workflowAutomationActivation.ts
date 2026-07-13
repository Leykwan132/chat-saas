export const WORKFLOW_AUTOMATION_MESSAGE_REQUIRED_ERROR =
  'You need to select a message first.';
export const WORKFLOW_AUTOMATION_SCOPE_REQUIRED_ERROR =
  'Choose what this automation should apply to first.';

export function resolveWorkflowAutomationEnabledChange(
  nextEnabled: boolean,
  messageSelected: boolean,
  activationScope: 'currentAndFuture' | 'futureOnly' | undefined,
) {
  if (nextEnabled && !messageSelected) {
    return { enabled: false, messageRequired: true, scopeRequired: false };
  }
  if (nextEnabled && !activationScope) {
    return { enabled: false, messageRequired: false, scopeRequired: true };
  }
  return { enabled: nextEnabled, messageRequired: false, scopeRequired: false };
}
