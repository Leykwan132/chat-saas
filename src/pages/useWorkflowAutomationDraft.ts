import { useCallback, useMemo, useState } from "react";
import type { WorkflowAutomationConfigs } from "../../shared/workflowAutomations";

export function useWorkflowAutomationDraft(
  persisted: WorkflowAutomationConfigs,
) {
  const [draft, setDraft] = useState<WorkflowAutomationConfigs>();
  const automations = draft ?? persisted;
  const isDirty =
    draft !== undefined &&
    JSON.stringify(persisted) !== JSON.stringify(draft);

  const update = useCallback((automations: WorkflowAutomationConfigs) => {
    setDraft(structuredClone(automations));
  }, []);
  const reset = useCallback(() => {
    setDraft(undefined);
  }, []);
  const acceptSaved = useCallback(() => {
    setDraft(undefined);
  }, []);

  return useMemo(
    () => ({
      automations,
      isDirty,
      update,
      reset,
      acceptSaved,
    }),
    [acceptSaved, automations, isDirty, reset, update],
  );
}
