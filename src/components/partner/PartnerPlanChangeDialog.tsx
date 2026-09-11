import { useState } from "react";
import {
  getCountLimitChange,
  getPlanLimitChanges,
} from "@/components/partner/partnerPlanChangeDiff";
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
import { cn } from "@/lib/utils";
import { PLAN_CATALOG } from "../../../shared/planCatalog";
import {
  type PartnerOverview,
  type PlanChangeTiming,
  type PlanKey,
} from "@/lib/whiteLabelApi";

type Organization = PartnerOverview["organizations"][number];

export type PendingLimitChange =
  | { kind: "plan"; organization: Organization; planKey: PlanKey }
  | { kind: "monthly"; organization: Organization; monthlyCredits: number };

function pendingTitle(kind: PendingLimitChange["kind"]) {
  return kind === "plan"
    ? "Confirm plan change"
    : "Confirm monthly credits change";
}

function pendingLimitChanges(pending: PendingLimitChange) {
  if (pending.kind === "plan") {
    return getPlanLimitChanges(
      pending.organization.planKey,
      pending.planKey,
      {
        includeAgents: false,
        includeMonthlyCredits: !pending.organization.hasCustomMonthlyCredits,
      },
    );
  }
  return getCountLimitChange(
    "Monthly credits",
    pending.organization.monthlyAllowance,
    pending.monthlyCredits,
  );
}

function PartnerLimitChangeDialogBody({
  pendingChange,
  onCancel,
  onConfirm,
}: {
  pendingChange: PendingLimitChange;
  onCancel: () => void;
  onConfirm: (timing: PlanChangeTiming) => void;
}) {
  const [timing, setTiming] = useState<PlanChangeTiming>(
    pendingChange.kind === "plan" ? "immediate" : "next_period",
  );
  const renewalDate = formatRenewalDate(pendingChange.organization.renewalAt);
  const limitChanges = pendingLimitChanges(pendingChange);

  return (
    <DialogContent className="rounded-lg border border-border shadow-none ring-0">
      <DialogHeader>
        <DialogTitle>{pendingTitle(pendingChange.kind)}</DialogTitle>
        <DialogDescription className="sr-only">
          Review the{" "}
          {pendingChange.kind === "plan"
            ? PLAN_CATALOG[pendingChange.planKey].name
            : "monthly credit"}{" "}
          changes, then choose when they apply.
        </DialogDescription>
      </DialogHeader>
      <ul className="flex flex-col gap-2 text-sm">
        {limitChanges.map((change) => (
          <li key={change.label} className="flex items-center justify-between gap-4">
            <span>{change.label}</span>
            <span className="tabular-nums text-muted-foreground">
              {change.from}
              {" -> "}
              <span
                className={cn(
                  change.direction === "up"
                    ? "text-emerald-600"
                    : "text-destructive",
                )}
              >
                {change.to}
              </span>
            </span>
          </li>
        ))}
      </ul>
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
      <DialogFooter className="flex-row justify-end">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={() => onConfirm(timing)}>Confirm</Button>
      </DialogFooter>
    </DialogContent>
  );
}

export function PartnerPlanChangeDialog({
  pendingChange,
  onCancel,
  onConfirm,
}: {
  pendingChange: PendingLimitChange | null;
  onCancel: () => void;
  onConfirm: (timing: PlanChangeTiming) => void;
}) {
  return (
    <Dialog
      open={pendingChange !== null}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      {pendingChange ? (
        <PartnerLimitChangeDialogBody
          key={`${pendingChange.kind}-${pendingChange.organization.partnerOrganizationId}`}
          pendingChange={pendingChange}
          onCancel={onCancel}
          onConfirm={onConfirm}
        />
      ) : null}
    </Dialog>
  );
}
