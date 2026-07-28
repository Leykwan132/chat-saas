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
    description: "All conversations, messages, contacts, agent threads, and conversation history will be permanently removed.",
  },
  {
    Icon: Trash2,
    label: "Your workspace data will be cleared",
    description: "Agents, workflows, knowledge, files, analytics, settings, and team memberships will be deleted.",
  },
  {
    Icon: Unplug,
    label: "Your channels will be disconnected",
    description: "WhatsApp, Instagram, Messenger, web widgets, and associated credentials will be removed and will stop processing messages.",
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
            Once your downgrade is completed, your team workspace and its data will be permanently deleted. This cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          {consequences.map(({ Icon, label, description }) => (
            <div
              key={label}
              className="flex items-start gap-3 rounded-xl bg-muted p-3"
            >
              <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="space-y-0.5">
                <div className="font-medium">{label}</div>
                <div className="text-sm text-muted-foreground">
                  {description}
                </div>
              </div>
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
