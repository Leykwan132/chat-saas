import { CheckCircle2, CircleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { useWhatsAppConnectionFlow } from '@/hooks/useWhatsAppConnectionFlow';

type ConnectWhatsAppButtonProps = {
  onConnected?: () => void;
  forceAllowConnect?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
};

export function ConnectWhatsAppButton({
  onConnected,
  forceAllowConnect,
  disabled,
  children,
}: ConnectWhatsAppButtonProps) {
  const {
    busy,
    dialogState,
    whatsappChannel,
    launchSignup,
    handleDialogOpenChange,
  } = useWhatsAppConnectionFlow({ onConnected });

  if (!forceAllowConnect && whatsappChannel?.status === 'connected') {
    return (
      <Button type="button" variant="outline" disabled>
        <CheckCircle2 className="size-4" />
        Connected
      </Button>
    );
  }

  if (children) {
    const isConnecting = busy || dialogState.kind === 'connecting';
    return (
      <>
        <button
          type="button"
          onClick={launchSignup}
          disabled={isConnecting || disabled}
          className={`group relative size-36 flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card p-3 text-center transition-all shadow-sm focus:outline-none ${
            isConnecting
              ? 'cursor-wait'
              : busy || disabled
                ? 'opacity-40 cursor-not-allowed'
                : 'hover:border-foreground/20 hover:bg-muted/30 cursor-pointer'
          }`}
        >
          {isConnecting ? (
            <Spinner className="size-6 text-muted-foreground" />
          ) : (
            children
          )}
        </button>
        <ConnectionErrorDialog
          dialogState={dialogState}
          onOpenChange={handleDialogOpenChange}
          onRetry={() => {
            handleDialogOpenChange(false);
            void launchSignup();
          }}
        />
      </>
    );
  }

  return (
    <>
      <div className="flex flex-col items-end gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={launchSignup}
          disabled={busy}
        >
          {busy && dialogState.kind === 'closed' ? (
            <>
              <Spinner className="size-3" />
              Connect
            </>
          ) : (
            'Connect'
          )}
        </Button>
      </div>
      <ConnectionErrorDialog
        dialogState={dialogState}
        onOpenChange={handleDialogOpenChange}
        onRetry={() => {
          handleDialogOpenChange(false);
          void launchSignup();
        }}
      />
    </>
  );
}

function ConnectionErrorDialog({
  dialogState,
  onOpenChange,
  onRetry,
}: {
  dialogState: ReturnType<typeof useWhatsAppConnectionFlow>['dialogState'];
  onOpenChange: (open: boolean) => void;
  onRetry: () => void;
}) {
  return (
    <Dialog open={dialogState.kind === 'error'} onOpenChange={onOpenChange}>
      <DialogContent>
        {dialogState.kind === 'error' ? (
          <ErrorState message={dialogState.message} onRetry={onRetry} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col gap-5 py-2">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
          <CircleAlert className="size-6" />
        </div>
        <div className="flex flex-col gap-1">
          <DialogTitle className="text-base">Connection failed</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
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
