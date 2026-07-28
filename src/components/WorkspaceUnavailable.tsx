import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";

type WorkspaceUnavailableProps = {
  onBackToPersonal: () => Promise<void>;
  loading: boolean;
};

export function WorkspaceUnavailable({
  onBackToPersonal,
  loading,
}: WorkspaceUnavailableProps) {
  return (
    <Dialog open>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Workspace no longer available</DialogTitle>
        </DialogHeader>
        <Button
          disabled={loading}
          onClick={() => void onBackToPersonal()}
        >
          {loading ? <Spinner data-icon="inline-start" /> : null}
          Back to Personal
        </Button>
      </DialogContent>
    </Dialog>
  );
}
