import { useState } from "react";
import { PartnerPlanSelect } from "@/components/partner/PartnerCustomerControls";
import { PartnerPanel } from "@/components/partner/PartnerPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatRenewalDate } from "@/lib/formatRenewalDate";
import { type PartnerOverview, type PlanKey } from "@/lib/whiteLabelApi";

type Organization = PartnerOverview["organizations"][number];

type PendingPlanChange = {
  organization: Organization;
  planKey: PlanKey;
};

export function PartnerOrganizationList({
  organizations,
  onPlanChange,
  onSuspend,
}: {
  organizations: PartnerOverview["organizations"];
  onPlanChange: (organization: Organization, planKey: PlanKey) => void;
  onSuspend: (organization: Organization) => void;
}) {
  const [pendingPlanChange, setPendingPlanChange] =
    useState<PendingPlanChange | null>(null);
  const [pendingSuspension, setPendingSuspension] =
    useState<Organization | null>(null);
  const pendingPlanRenewalDate = pendingPlanChange
    ? formatRenewalDate(pendingPlanChange.organization.renewalAt)
    : null;

  const confirmPlanChange = () => {
    if (pendingPlanChange === null) return;
    onPlanChange(pendingPlanChange.organization, pendingPlanChange.planKey);
    setPendingPlanChange(null);
  };

  const confirmSuspension = () => {
    if (pendingSuspension === null) return;
    onSuspend(pendingSuspension);
    setPendingSuspension(null);
  };

  return (
    <section className="mt-8 flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-base font-medium">Organizations</h2>
        <p className="text-sm text-muted-foreground">
          Manage customer organizations, plans, and credits.
        </p>
      </div>
      {organizations.length === 0 ? (
        <Empty className="rounded-lg border border-dashed bg-muted/20">
          <EmptyHeader>
            <EmptyTitle>No organizations yet</EmptyTitle>
            <EmptyDescription>
              Create your first customer organization using the action above.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <PartnerPanel className="gap-0 py-0">
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead className="text-right">Customers</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead className="text-right">Monthly</TableHead>
                  <TableHead className="text-right">Top-up</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organizations.map((organization) => (
                  <TableRow key={organization.partnerOrganizationId}>
                    <TableCell className="font-medium">
                      {organization.name}
                    </TableCell>
                    <TableCell className="text-right">
                      {organization.customerCount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <PartnerPlanSelect
                        value={organization.planKey}
                        onValueChange={(planKey) => {
                          if (planKey !== organization.planKey) {
                            setPendingPlanChange({ organization, planKey });
                          }
                        }}
                        compact
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      {organization.monthlyAllowance.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {organization.addedCredits.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {organization.remainingCredits.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge className="gap-1.5 capitalize" variant="secondary">
                        <span className="size-1.5 rounded-full bg-emerald-500" />
                        {organization.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setPendingSuspension(organization)}
                      >
                        Suspend
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </PartnerPanel>
      )}
      <Dialog
        open={pendingPlanChange !== null}
        onOpenChange={(open) => {
          if (!open) setPendingPlanChange(null);
        }}
      >
        <DialogContent className="rounded-lg border border-border shadow-none ring-0">
          <DialogHeader>
            <DialogTitle>Confirm plan change</DialogTitle>
            <DialogDescription>
              Change {pendingPlanChange?.organization.name} to the{" "}
              {pendingPlanChange?.planKey} plan? The monthly credits will
              reset on {pendingPlanRenewalDate}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPendingPlanChange(null)}>
              Cancel
            </Button>
            <Button onClick={confirmPlanChange}>Confirm plan change</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={pendingSuspension !== null}
        onOpenChange={(open) => {
          if (!open) setPendingSuspension(null);
        }}
      >
        <DialogContent className="rounded-lg border border-border shadow-none ring-0">
          <DialogHeader>
            <DialogTitle>Suspend organization</DialogTitle>
            <DialogDescription>
              Suspend {pendingSuspension?.name}? Customer access to this
              organization will be paused.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPendingSuspension(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmSuspension}>
              Suspend organization
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
