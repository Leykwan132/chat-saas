import { expect, test } from "vitest";
import { createInitialWorkflowAutomationConfigs } from "../../shared/workflowAutomations";
import {
  createWorkflowAutomationDraft,
  isWorkflowAutomationDraftDirty,
  resetWorkflowAutomationDraft,
  syncPersistedWorkflowAutomations,
  updateWorkflowAutomationDraft,
} from "./workflowAutomationDraftModel";

test("preserves dirty automation edits while adopting the latest baseline", () => {
  const initialAutomations = createInitialWorkflowAutomationConfigs();
  const changedAutomations = {
    ...initialAutomations,
    followUp: {
      ...initialAutomations.followUp,
      maxAttempts: 2,
    },
  };
  const dirty = updateWorkflowAutomationDraft(
    createWorkflowAutomationDraft(initialAutomations),
    changedAutomations,
  );

  const rebased = syncPersistedWorkflowAutomations(
    dirty,
    initialAutomations,
  );

  expect(isWorkflowAutomationDraftDirty(rebased)).toBe(true);
  expect(rebased.draft).toEqual(changedAutomations);
  expect(rebased.baseline).toEqual(initialAutomations);
});

test("clean drafts adopt persisted automations and reset uses the latest baseline", () => {
  const initialAutomations = createInitialWorkflowAutomationConfigs();
  const persistedAutomations = {
    ...initialAutomations,
    followUp: {
      ...initialAutomations.followUp,
      maxAttempts: 2,
    },
  };
  const synced = syncPersistedWorkflowAutomations(
    createWorkflowAutomationDraft(initialAutomations),
    persistedAutomations,
  );

  expect(synced.draft).toEqual(persistedAutomations);
  expect(isWorkflowAutomationDraftDirty(synced)).toBe(false);
  expect(resetWorkflowAutomationDraft(synced).draft).toEqual(
    persistedAutomations,
  );
});
