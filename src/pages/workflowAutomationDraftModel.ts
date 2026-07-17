import type { WorkflowAutomationConfigs } from "../../shared/workflowAutomations";

export type WorkflowAutomationDraftState = {
  baseline: WorkflowAutomationConfigs;
  draft: WorkflowAutomationConfigs;
};

function cloneAutomations(automations: WorkflowAutomationConfigs) {
  return structuredClone(automations);
}

export function createWorkflowAutomationDraft(
  automations: WorkflowAutomationConfigs,
): WorkflowAutomationDraftState {
  return {
    baseline: cloneAutomations(automations),
    draft: cloneAutomations(automations),
  };
}

export function isWorkflowAutomationDraftDirty(
  state: WorkflowAutomationDraftState,
) {
  return JSON.stringify(state.baseline) !== JSON.stringify(state.draft);
}

export function updateWorkflowAutomationDraft(
  state: WorkflowAutomationDraftState,
  automations: WorkflowAutomationConfigs,
): WorkflowAutomationDraftState {
  return {
    baseline: cloneAutomations(state.baseline),
    draft: cloneAutomations(automations),
  };
}

export function syncPersistedWorkflowAutomations(
  state: WorkflowAutomationDraftState,
  automations: WorkflowAutomationConfigs,
): WorkflowAutomationDraftState {
  const dirty = isWorkflowAutomationDraftDirty(state);
  return {
    baseline: cloneAutomations(automations),
    draft: cloneAutomations(dirty ? state.draft : automations),
  };
}

export function resetWorkflowAutomationDraft(
  state: WorkflowAutomationDraftState,
): WorkflowAutomationDraftState {
  return createWorkflowAutomationDraft(state.baseline);
}
