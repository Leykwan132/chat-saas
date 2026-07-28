import {
  MessageSquareOff,
  Trash2,
  Unplug,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";

type ConfirmTeamDowngradeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  loading: boolean;
};

const consequences = [
  {
    Icon: MessageSquareOff,
    label: "Your conversations will be deleted",
  },
  {
    Icon: Trash2,
    label: "Your workspace data will be cleared",
  },
  {
    Icon: Unplug,
    label: "Your channels will be disconnected",
  },
] as const;

export function ConfirmTeamDowngradeDialog({
  open,
  onOpenChange,
  onConfirm,
  loading,
}: ConfirmTeamDowngradeDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!loading) onOpenChange(nextOpen);
      }}
    >
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Confirm downgrade</DialogTitle>
          <DialogDescription>
            Downgrading to Free permanently deletes this team workspace and
            its data. This cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          {consequences.map(({ Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-3 rounded-xl bg-muted p-3"
            >
              <Icon className="size-4 shrink-0 text-muted-foreground" />
              <span>{label}</span>
            </div>
          ))}
        </div>

        <DialogFooter className="flex-col sm:flex-col">
          <Button
            variant="destructive"
            disabled={loading}
            onClick={() => void onConfirm()}
          >
            {loading ? <Spinner data-icon="inline-start" /> : null}
            Confirm downgrade
          </Button>
          <Button
            variant="ghost"
            disabled={loading}
            onClick={() => onOpenChange(false)}
          >
            Go back
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
