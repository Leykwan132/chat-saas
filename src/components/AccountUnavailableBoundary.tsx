import { useState } from "react";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";
import { isAccountUnavailableError } from "@/lib/accountUnavailable";
import { useAuth } from "@/partnerAuth/AppAuthProvider";
import { clearPartnerSession } from "@/partnerAuth/partnerSessionStorage";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";

function AccountUnavailableFallback({ error }: FallbackProps) {
  const { signOut } = useAuth();
  const [isLeaving, setIsLeaving] = useState(false);

  if (!isAccountUnavailableError(error)) {
    throw error;
  }

  const returnHome = () => {
    if (isLeaving) {
      return;
    }
    setIsLeaving(true);
    clearPartnerSession();
    void signOut({ navigate: false })
      .catch(() => undefined)
      .finally(() => {
        window.location.replace("/");
      });
  };

  return (
    <Dialog open>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Account no longer available</DialogTitle>
        </DialogHeader>
        {isLeaving ? (
          <div
            aria-live="polite"
            className="flex flex-col items-center justify-center gap-3 py-2"
          >
            <Spinner className="size-7 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Preparing session</p>
          </div>
        ) : (
          <Button onClick={returnHome}>Back to home</Button>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function AccountUnavailableBoundary({ children }: { children: React.ReactNode }) {
  return <ErrorBoundary FallbackComponent={AccountUnavailableFallback}>{children}</ErrorBoundary>;
}
