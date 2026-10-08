import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import type { QuickRepliesEditor } from './useQuickRepliesEditor';

export function QuickReplyDeleteDialog({ editor }: { editor: QuickRepliesEditor }) {
  const { deletingReply, setDeletingReply, isDeleting, handleDelete } = editor;
  return (
    <Dialog open={!!deletingReply} onOpenChange={(open) => !open && !isDeleting && setDeletingReply(null)}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Delete quick reply?</DialogTitle>
          <DialogDescription>
            Delete “{deletingReply?.title}”? This cannot be undone. Your team will no longer be able to use this reply.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" disabled={isDeleting} onClick={() => setDeletingReply(null)}>Cancel</Button>
          <Button variant="destructive" className="bg-destructive text-white hover:bg-destructive/90 dark:bg-destructive dark:text-white dark:hover:bg-destructive/90" disabled={isDeleting} onClick={handleDelete}>
            {isDeleting ? <Spinner /> : null}
            {isDeleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
