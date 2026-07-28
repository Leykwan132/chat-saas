import { Bot, MessagesSquare, Unplug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';

const consequences = [
  {
    Icon: MessagesSquare,
    text: 'Conversations and contacts will be deleted',
  },
  {
    Icon: Bot,
    text: 'Agents and their threads will be deleted',
  },
  {
    Icon: Unplug,
    text: 'Connected channels will be disconnected',
  },
] as const;

type TeamFreePlanWarningDialogProps = {
  open: boolean;
  loading: boolean;
  onOpenChange: (open: boolean) => void;
  onGoBack: () => void;
  onContinue: () => void;
};

export function TeamFreePlanWarningDialog({
  open,
  loading,
  onOpenChange,
  onGoBack,
  onContinue,
}: TeamFreePlanWarningDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!loading) onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm downgrade</DialogTitle>
          <DialogDescription>
            Switching this team to Free permanently deletes the workspace and
            its data. This cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-sm">
          {consequences.map(({ Icon, text }) => (
            <div
              key={text}
              className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3"
            >
              <Icon className="size-4 shrink-0 text-muted-foreground" />
              <span>{text}</span>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            disabled={loading}
            onClick={onGoBack}
          >
            Go back
          </Button>
          <Button type="button" disabled={loading} onClick={onContinue}>
            {loading ? <Spinner /> : null}
            Continue anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
