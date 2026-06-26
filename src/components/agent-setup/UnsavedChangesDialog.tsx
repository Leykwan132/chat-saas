import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type UnsavedChangesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onKeepEditing: () => void;
  onDiscard: () => void;
};

export function UnsavedChangesDialog({
  open,
  onOpenChange,
  onKeepEditing,
  onDiscard,
}: UnsavedChangesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Unsaved changes</DialogTitle>
          <DialogDescription>
            You have unsaved changes on this page. Are you sure you want to leave without saving?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col gap-2 pt-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={onKeepEditing}
            className="w-full sm:w-auto"
          >
            Keep Editing
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onDiscard}
            className="w-full sm:w-auto"
          >
            Discard and Leave
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
