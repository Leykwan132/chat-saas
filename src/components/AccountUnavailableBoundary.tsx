import { ErrorBoundary, type FallbackProps } from "react-error-boundary";
import { useNavigate } from "react-router";
import { isAccountUnavailableError } from "@/lib/accountUnavailable";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function AccountUnavailableFallback({ error, resetErrorBoundary }: FallbackProps) {
  const navigate = useNavigate();

  if (!isAccountUnavailableError(error)) {
    throw error;
  }

  const returnHome = () => {
    navigate('/', { replace: true });
    resetErrorBoundary();
  };

  return (
    <Dialog open>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Account no longer available</DialogTitle>
        </DialogHeader>
        <Button onClick={returnHome}>Back to home</Button>
      </DialogContent>
    </Dialog>
  );
}

export function AccountUnavailableBoundary({ children }: { children: React.ReactNode }) {
  return <ErrorBoundary FallbackComponent={AccountUnavailableFallback}>{children}</ErrorBoundary>;
}
