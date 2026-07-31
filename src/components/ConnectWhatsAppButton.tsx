import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { WhatsAppConnectionErrorContent } from '@/components/channels/WhatsAppConnectionFeedback';
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
      />
    </>
  );
}

function ConnectionErrorDialog({
  dialogState,
  onOpenChange,
}: {
  dialogState: ReturnType<typeof useWhatsAppConnectionFlow>['dialogState'];
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={dialogState.kind === 'error'} onOpenChange={onOpenChange}>
      <DialogContent>
        {dialogState.kind === 'error' ? (
          <WhatsAppConnectionErrorContent message={dialogState.message} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
