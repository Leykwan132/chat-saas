import { useState } from "react";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { PartnerPlanSelect } from "@/components/partner/PartnerCustomerControls";
import { PartnerPanel } from "@/components/partner/PartnerPanel";
import {
  PartnerPlanChangeDialog,
  type PendingPlanChange,
} from "@/components/partner/PartnerPlanChangeDialog";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Spinner } from "@/components/ui/spinner";
import { formatRenewalDate } from "@/lib/formatRenewalDate";
import {
  type PartnerOverview,
  type PlanChangeTiming,
  type PlanKey,
} from "@/lib/whiteLabelApi";

type Organization = PartnerOverview["organizations"][number];

export function PartnerOrganizationList({
  organizations,
  onPlanChange,
  onDelete,
}: {
  organizations: PartnerOverview["organizations"];
  onPlanChange: (
    organization: Organization,
    planKey: PlanKey,
    timing: PlanChangeTiming,
  ) => void;
  onDelete: (organization: Organization) => Promise<boolean>;
}) {
  const [pendingPlanChange, setPendingPlanChange] =
    useState<PendingPlanChange | null>(null);
  const [pendingDeletion, setPendingDeletion] = useState<Organization | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmPlanChange = (timing: PlanChangeTiming) => {
    if (pendingPlanChange === null) return;
    onPlanChange(
      pendingPlanChange.organization,
      pendingPlanChange.planKey,
      timing,
    );
    setPendingPlanChange(null);
  };

  const confirmDeletion = async () => {
    if (pendingDeletion === null) return;
    setIsDeleting(true);
    try {
      if (await onDelete(pendingDeletion)) {
        setPendingDeletion(null);
      }
    } finally {
      setIsDeleting(false);
    }
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
                  <TableHead className="text-center">Users</TableHead>
                  <TableHead className="text-center">Plan</TableHead>
                  <TableHead className="text-center">Monthly</TableHead>
                  <TableHead className="text-center">Top-up</TableHead>
                  <TableHead className="text-center">Remaining</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organizations.map((organization) => (
                  <TableRow key={organization.partnerOrganizationId}>
                    <TableCell className="font-medium">
                      {organization.name}
                    </TableCell>
                    <TableCell className="text-center">
                      {organization.customerCount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-center gap-1">
                        <PartnerPlanSelect
                          value={organization.planKey}
                          onValueChange={(planKey) => {
                            if (planKey !== organization.planKey) {
                              setPendingPlanChange({ organization, planKey });
                            }
                          }}
                          compact
                        />
                        {organization.scheduledPlanChange ? (
                          <p className="text-center text-xs text-muted-foreground">
                            {organization.scheduledPlanChange.planKey} credits
                            from{" "}
                            {formatRenewalDate(
                              organization.scheduledPlanChange.effectiveAt,
                            )}
                          </p>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {organization.monthlyAllowance.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      {organization.addedCredits.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      {organization.remainingCredits.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center">
                        <Badge className="gap-1.5 capitalize" variant="secondary">
                          <span className="size-1.5 rounded-full bg-emerald-500" />
                          {organization.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              aria-label={`Organization actions for ${organization.name}`}
                              size="icon"
                              variant="ghost"
                            >
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onSelect={() => setPendingDeletion(organization)}
                            >
                              <Trash2 />
                              Delete organization
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </PartnerPanel>
      )}
      <PartnerPlanChangeDialog
        pendingChange={pendingPlanChange}
        onCancel={() => setPendingPlanChange(null)}
        onConfirm={confirmPlanChange}
      />
      <Dialog
        open={pendingDeletion !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeletion(null);
        }}
      >
        <DialogContent className="rounded-lg border border-border shadow-none ring-0">
          <DialogHeader>
            <DialogTitle>Delete organization</DialogTitle>
            <DialogDescription>
              Delete {pendingDeletion?.name}? This removes the workspace and
              all user access within it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              disabled={isDeleting}
              variant="ghost"
              onClick={() => setPendingDeletion(null)}
            >
              Cancel
            </Button>
            <Button
              disabled={isDeleting}
              variant="destructive"
              onClick={() => void confirmDeletion()}
            >
              {isDeleting ? <Spinner data-icon="inline-start" /> : null}
              Delete organization
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
