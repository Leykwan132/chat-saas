import { CircleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import {
  isMessengerConnectionDialogDismissible,
  isMessengerConnectionDialogOpen,
  type MessengerConnectionDialogState,
} from '@/components/messengerConnectionDialogState';
import { getCustomerSafeMessengerConnectionFailureMessage } from '@/lib/messengerConnectionFeedback';

export function MessengerConnectionStatusDialog({
  state,
  onOpenChange,
  onRetry,
}: {
  state: MessengerConnectionDialogState;
  onOpenChange: (open: boolean) => void;
  onRetry: () => void;
}) {
  const isConnecting = state.kind === 'connecting';
  const isDismissible = isMessengerConnectionDialogDismissible(state);

  return (
    <Dialog
      open={isMessengerConnectionDialogOpen(state)}
      onOpenChange={onOpenChange}
    >
      <DialogContent
        showCloseButton={isDismissible}
        onEscapeKeyDown={isDismissible ? undefined : (event) => event.preventDefault()}
        onInteractOutside={isDismissible ? undefined : (event) => event.preventDefault()}
        onPointerDownOutside={isDismissible ? undefined : (event) => event.preventDefault()}
      >
        {isConnecting ? (
          <MessengerConnectingContent />
        ) : state.kind === 'error' ? (
          <MessengerConnectionErrorContent onRetry={onRetry} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export function MessengerConnectingContent() {
  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center sm:py-10">
      <Spinner className="size-8 text-muted-foreground" />
      <div className="flex flex-col gap-1">
        <DialogTitle className="text-lg font-semibold sm:text-xl">
          Connecting to Facebook
        </DialogTitle>
        <DialogDescription>Getting your Facebook Pages…</DialogDescription>
      </div>
    </div>
  );
}

export function MessengerConnectionErrorContent({
  onRetry,
}: {
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col gap-5 py-2">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
          <CircleAlert className="size-6" />
        </div>
        <div className="flex flex-col gap-1">
          <DialogTitle className="text-base">Couldn’t connect Messenger</DialogTitle>
          <DialogDescription>
            {getCustomerSafeMessengerConnectionFailureMessage()}
          </DialogDescription>
        </div>
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <DialogClose asChild>
          <Button variant="outline">Close</Button>
        </DialogClose>
        <Button type="button" onClick={onRetry}>
          Try again
        </Button>
      </div>
    </div>
  );
}
