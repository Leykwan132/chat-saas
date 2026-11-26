import { useParams } from "react-router";
import type { Id } from "../../../convex/_generated/dataModel";
import { FocusNotificationSettings } from "./FocusNotificationSettings";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/partnerAuth/AppAuthProvider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ResetPasswordDialog } from "@/components/ResetPasswordDialog";
import { Spinner } from "@/components/ui/spinner";

export function InboxFocusSettings({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { user } = useAuth();
  const { agentId } = useParams();
  const available = useQuery(
    api.whiteLabel.customerAccounts.hasCurrentPasswordAccount,
    open ? {} : "skip",
  );
  const [resetOpen, setResetOpen] = useState(false);
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>
              Manage your notifications and password.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
          {open && agentId && (
            <FocusNotificationSettings agentId={agentId as Id<"agents">} />
          )}
          {available === undefined ? (
            <Spinner className="size-4" />
          ) : available ? (
            <Button
              variant="outline"
              className="w-fit"
              onClick={() => {
                onOpenChange(false);
                setResetOpen(true);
              }}
            >
              Reset password
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Your password is managed by your sign-in provider.
            </p>
          )}
        </DialogContent>
      </Dialog>
      {resetOpen ? (
        <ResetPasswordDialog open={resetOpen} onOpenChange={setResetOpen} />
      ) : null}
    </>
  );
}
