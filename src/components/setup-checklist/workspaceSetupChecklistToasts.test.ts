import { expect, test, vi } from 'vitest';
import { toast } from 'sonner';
import {
  SETUP_STEP_OPENING_TOAST_DURATION_MS,
  showWorkspaceSetupChecklistStepOpeningToast,
} from './workspaceSetupChecklistToasts';

vi.mock('sonner', () => ({
  toast: {
    dismiss: vi.fn(),
    loading: vi.fn(() => 'setup-step-toast'),
  },
}));

test('setup step opening toast dismisses after its short loading cue', () => {
  let scheduledCallback: (() => void) | null = null;
  let scheduledDelay = 0;

  showWorkspaceSetupChecklistStepOpeningToast((callback, delay) => {
    scheduledCallback = callback;
    scheduledDelay = delay;
    return 1;
  });

  expect(vi.mocked(toast.loading).mock.calls[0]?.[0]).toBe('Opening setup step...');
  expect(scheduledDelay).toBe(SETUP_STEP_OPENING_TOAST_DURATION_MS);

  scheduledCallback?.();

  expect(toast.dismiss).toHaveBeenCalledWith('setup-step-toast');
});
