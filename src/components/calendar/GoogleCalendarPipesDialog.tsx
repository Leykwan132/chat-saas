import { Pipes, WorkOsWidgets } from "@workos-inc/widgets";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function GoogleCalendarPipesDialog({
  open,
  authToken,
  onOpenChange,
}: {
  open: boolean;
  authToken: () => Promise<string>;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Connect Google Calendar</DialogTitle>
          <DialogDescription>
            Authorize Kilobot to read and write events on your primary Google Calendar.
          </DialogDescription>
        </DialogHeader>
        <WorkOsWidgets className="workos-widgets--panel">
          <Pipes authToken={authToken} />
        </WorkOsWidgets>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
