import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export type CustomerCredentials = {
  email: string;
  initialPassword: string;
  passwordResetAt?: number | null;
};

function copy(value: string, label: string) {
  void navigator.clipboard.writeText(value);
  toast.success(`${label} copied.`);
}

export function PartnerCustomerCredentialsDialog({
  credentials,
  onClose,
}: {
  credentials: CustomerCredentials | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={credentials !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="rounded-lg border border-border shadow-none ring-0">
        <DialogHeader>
          <DialogTitle>Customer account created</DialogTitle>
          <DialogDescription>
            Share these one-time sign-in details securely. The customer can reset their password from Settings after signing in.
          </DialogDescription>
        </DialogHeader>
        {credentials ? (
          <div className="flex flex-col gap-4">
            <Field>
              <FieldLabel>Email</FieldLabel>
              <div className="flex gap-2">
                <Input readOnly value={credentials.email} />
                <Button size="icon" variant="ghost" onClick={() => copy(credentials.email, "Email")}>
                  <Copy />
                  <span className="sr-only">Copy email</span>
                </Button>
              </div>
            </Field>
            <Field>
              <FieldLabel>{credentials.passwordResetAt ? "Initial password — no longer current" : "Initial password"}</FieldLabel>
              <div className="flex gap-2">
                <Input readOnly value={credentials.initialPassword} />
                <Button size="icon" variant="ghost" onClick={() => copy(credentials.initialPassword, "Password")}>
                  <Copy />
                  <span className="sr-only">Copy initial password</span>
                </Button>
              </div>
            </Field>
          </div>
        ) : null}
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
