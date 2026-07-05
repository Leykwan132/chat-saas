import { toast } from 'sonner';

export const SETUP_STEP_OPENING_TOAST_DURATION_MS = 900;

type ScheduleDismiss = (callback: () => void, delay: number) => unknown;

export function showWorkspaceSetupChecklistStepOpeningToast(
  scheduleDismiss: ScheduleDismiss = globalThis.setTimeout,
) {
  const toastId = toast.loading('Opening setup step...');
  scheduleDismiss(
    () => toast.dismiss(toastId),
    SETUP_STEP_OPENING_TOAST_DURATION_MS,
  );
}
