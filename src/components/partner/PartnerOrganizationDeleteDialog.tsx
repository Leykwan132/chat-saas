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
import { type PartnerOverview } from "@/lib/whiteLabelApi";

type Organization = PartnerOverview["organizations"][number];

export function PartnerOrganizationDeleteDialog({
  organization,
  isDeleting,
  onCancel,
  onConfirm,
}: {
  organization: Organization | null;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog
      open={organization !== null}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogContent className="rounded-lg border border-border shadow-none ring-0">
        <DialogHeader>
          <DialogTitle>Delete organization</DialogTitle>
          <DialogDescription>
            Delete {organization?.name}? This removes the workspace and
            all user access within it.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button disabled={isDeleting} variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            disabled={isDeleting}
            variant="destructive"
            onClick={onConfirm}
          >
            {isDeleting ? <Spinner data-icon="inline-start" /> : null}
            Delete organization
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
