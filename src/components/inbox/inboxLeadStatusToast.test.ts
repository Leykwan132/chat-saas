import { toast } from 'sonner';
import { expect, test, vi } from 'vitest';
import { runInboxLeadStatusUpdate } from './inboxLeadStatusToast';

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    loading: vi.fn(() => 'lead-status-toast'),
    success: vi.fn(),
  },
}));

test('replaces the lead status loading toast with success', async () => {
  await runInboxLeadStatusUpdate(async () => undefined);

  expect(toast.loading).toHaveBeenCalledWith('Updating lead status…');
  expect(toast.success).toHaveBeenCalledWith('Lead status updated', {
    id: 'lead-status-toast',
  });
});

test('replaces the lead status loading toast with the failure message', async () => {
  await runInboxLeadStatusUpdate(async () => {
    throw new Error('Update rejected');
  });

  expect(toast.error).toHaveBeenCalledWith('Update rejected', {
    id: 'lead-status-toast',
  });
});
