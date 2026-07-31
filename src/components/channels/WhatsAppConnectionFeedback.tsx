import { Link } from 'react-router';
import { SquareIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';

type WhatsAppConnectingActionProps = {
  stopping: boolean;
  onStop: () => void;
};

export function WhatsAppConnectingAction({
  stopping,
  onStop,
}: WhatsAppConnectingActionProps) {
  return (
    <div className="flex w-full min-w-0 items-center gap-2">
      <Spinner className="size-3.5 shrink-0 text-amber-500" />
      <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-muted-foreground">
        {stopping ? 'Stopping…' : 'Connecting…'}
      </span>
      <Button
        type="button"
        variant="destructiveGhost"
        size="icon-xs"
        aria-label={
          stopping
            ? 'Stopping WhatsApp connection'
            : 'Stop WhatsApp connection'
        }
        disabled={stopping}
        onClick={onStop}
      >
        {stopping ? (
          <Spinner data-icon="inline-start" />
        ) : (
          <SquareIcon data-icon="inline-start" className="fill-current" />
        )}
      </Button>
    </div>
  );
}

export function WhatsAppConnectionErrorContent({
  message,
}: {
  message: string;
}) {
  return (
    <>
      <DialogHeader className="text-left">
        <DialogTitle className="text-base">Connection failed</DialogTitle>
        <DialogDescription className="text-left">{message}</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button asChild>
          <Link to="/contact?intent=support">Contact support</Link>
        </Button>
      </DialogFooter>
    </>
  );
}
