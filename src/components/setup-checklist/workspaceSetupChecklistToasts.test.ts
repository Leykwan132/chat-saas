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
  const scheduledCallbacks: Array<() => void> = [];
  let scheduledDelay = 0;

  showWorkspaceSetupChecklistStepOpeningToast((callback, delay) => {
    scheduledCallbacks.push(callback);
    scheduledDelay = delay;
    return 1;
  });

  expect(vi.mocked(toast.loading).mock.calls[0]?.[0]).toBe('Opening setup step...');
  expect(scheduledCallbacks).toHaveLength(1);
  expect(scheduledDelay).toBe(SETUP_STEP_OPENING_TOAST_DURATION_MS);

  scheduledCallbacks[0]();

  expect(toast.dismiss).toHaveBeenCalledWith('setup-step-toast');
});
