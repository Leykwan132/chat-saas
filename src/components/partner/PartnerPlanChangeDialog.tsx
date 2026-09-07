import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { formatRenewalDate } from "@/lib/formatRenewalDate";
import {
  type PartnerOverview,
  type PlanChangeTiming,
  type PlanKey,
} from "@/lib/whiteLabelApi";

type Organization = PartnerOverview["organizations"][number];

export type PendingPlanChange = {
  organization: Organization;
  planKey: PlanKey;
};

export function PartnerPlanChangeDialog({
  pendingChange,
  onCancel,
  onConfirm,
}: {
  pendingChange: PendingPlanChange | null;
  onCancel: () => void;
  onConfirm: (timing: PlanChangeTiming) => void;
}) {
  const [timing, setTiming] = useState<PlanChangeTiming>("immediate");
  const renewalDate = pendingChange
    ? formatRenewalDate(pendingChange.organization.renewalAt)
    : null;

  const close = (confirm: boolean) => {
    if (confirm) onConfirm(timing);
    else onCancel();
    setTiming("immediate");
  };

  return (
    <Dialog
      open={pendingChange !== null}
      onOpenChange={(open) => {
        if (!open) close(false);
      }}
    >
      <DialogContent className="rounded-lg border border-border shadow-none ring-0">
        <DialogHeader>
          <DialogTitle>Confirm plan change</DialogTitle>
          <DialogDescription>
            Change {pendingChange?.organization.name} to the{" "}
            {pendingChange?.planKey} plan. Choose when the new monthly credits
            apply.
          </DialogDescription>
        </DialogHeader>
        <RadioGroup
          value={timing}
          onValueChange={(value) => setTiming(value as PlanChangeTiming)}
          className="w-fit"
        >
          <div className="flex items-start gap-3">
            <RadioGroupItem value="immediate" id="plan-change-immediate" className="mt-0.5" />
            <div className="flex flex-col gap-1">
              <Label htmlFor="plan-change-immediate">Change immediately</Label>
              <p className="text-sm text-muted-foreground">
                Monthly and remaining credits update now.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <RadioGroupItem value="next_period" id="plan-change-next-period" className="mt-0.5" />
            <div className="flex flex-col gap-1">
              <Label htmlFor="plan-change-next-period">
                Change at the end of the billing period
              </Label>
              <p className="text-sm text-muted-foreground">
                Current credits stay until {renewalDate}.
              </p>
            </div>
          </div>
        </RadioGroup>
        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" onClick={() => close(false)}>
            Cancel
          </Button>
          <Button onClick={() => close(true)}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
