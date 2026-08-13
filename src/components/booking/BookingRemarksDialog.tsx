import { useEffect, useState } from 'react';
import { useAction } from 'convex/react';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';

type BookingRemarksDialogProps = {
  eventId: Id<'calendarEvents'> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialRemarks?: string;
};

export function BookingRemarksDialog({
  eventId,
  open,
  onOpenChange,
  initialRemarks = '',
}: BookingRemarksDialogProps) {
  const [remarks, setRemarks] = useState(initialRemarks);
  const [isSaving, setIsSaving] = useState(false);
  const updateEvent = useAction(api.calendarEvents.update);

  useEffect(() => {
    if (open) {
      setRemarks(initialRemarks);
    }
  }, [initialRemarks, open]);

  const handleSave = async () => {
    if (!eventId) return;
    setIsSaving(true);
    try {
      await updateEvent({
        eventId,
        remarks: remarks.trim(),
      });
      toast.success(remarks.trim() ? 'Remarks saved' : 'Remarks removed');
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save remarks');
    } finally {
      setIsSaving(false);
    }
  };

  const hasExistingRemarks = initialRemarks.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{hasExistingRemarks ? 'Edit remarks' : 'Add remarks'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="booking-remarks-input">Remarks</Label>
          <Textarea
            id="booking-remarks-input"
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
            placeholder="Add internal notes for this booking"
            className="min-h-28"
            autoFocus
          />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="ghost"
            disabled={isSaving}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" disabled={isSaving || !eventId} onClick={() => void handleSave()}>
            {isSaving ? <Spinner className="size-4" /> : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
