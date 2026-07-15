import { toast } from 'sonner';

export async function runInboxLeadStatusUpdate(
  update: () => Promise<unknown>,
) {
  const toastId = toast.loading('Updating lead status…');
  try {
    await update();
    toast.success('Lead status updated', { id: toastId });
  } catch (error) {
    toast.error(
      error instanceof Error ? error.message : 'Could not update lead status',
      { id: toastId },
    );
  }
}
