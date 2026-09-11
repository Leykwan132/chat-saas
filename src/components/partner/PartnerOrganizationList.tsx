import { useState } from "react";
import { useQuery } from "convex/react";
import { MoreHorizontal, Trash2 } from "lucide-react";
import {
  PartnerLimitInput,
  PartnerModelSelect,
  PartnerPlanSelect,
  PartnerScheduledNote,
} from "@/components/partner/PartnerCustomerControls";
import { PartnerOrganizationDeleteDialog } from "@/components/partner/PartnerOrganizationDeleteDialog";
import { PartnerPanel } from "@/components/partner/PartnerPanel";
import {
  PartnerPlanChangeDialog,
  type PendingLimitChange,
} from "@/components/partner/PartnerPlanChangeDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
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
import { PLAN_CATALOG } from "../../../shared/planCatalog";
import {
  type PartnerOverview,
  type PlanChangeTiming,
  type PlanKey,
  whiteLabelApi,
} from "@/lib/whiteLabelApi";

type Organization = PartnerOverview["organizations"][number];

export function PartnerOrganizationList({
  organizations,
  onPlanChange,
  onEntitlementsChange,
  onDelete,
}: {
  organizations: PartnerOverview["organizations"];
  onPlanChange: (
    organization: Organization,
    planKey: PlanKey,
    timing: PlanChangeTiming,
  ) => void;
  onEntitlementsChange: (
    organization: Organization,
    entitlements: { maxAgents?: number; monthlyCredits?: number; modelId?: string },
    timing?: PlanChangeTiming,
  ) => void;
  onDelete: (organization: Organization) => Promise<boolean>;
}) {
  const [pendingChange, setPendingChange] = useState<PendingLimitChange | null>(null);
  const [pendingDeletion, setPendingDeletion] = useState<Organization | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [limitInputEpoch, setLimitInputEpoch] = useState(0);
  const models = useQuery(whiteLabelApi.portal.listEnabledAgentModels);

  const closePendingChange = () => {
    setPendingChange(null);
    setLimitInputEpoch((epoch) => epoch + 1);
  };

  const confirmChange = (timing: PlanChangeTiming) => {
    if (pendingChange === null) return;
    if (pendingChange.kind === "plan") {
      onPlanChange(pendingChange.organization, pendingChange.planKey, timing);
    } else {
      onEntitlementsChange(
        pendingChange.organization,
        { monthlyCredits: pendingChange.monthlyCredits },
        timing,
      );
    }
    closePendingChange();
  };

  const confirmDeletion = async () => {
    if (pendingDeletion === null) return;
    setIsDeleting(true);
    try {
      if (await onDelete(pendingDeletion)) setPendingDeletion(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section className="mt-8 flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-base font-medium">Organizations</h2>
        <p className="text-sm text-muted-foreground">
          Manage customer organizations, plans, models, and credits.
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
                  <TableHead className="text-center">Model</TableHead>
                  <TableHead className="text-center">Agents</TableHead>
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
                              setPendingChange({
                                kind: "plan",
                                organization,
                                planKey,
                              });
                            }
                          }}
                          compact
                        />
                        {organization.scheduledPlanChange ? (
                          <PartnerScheduledNote
                            value={`${PLAN_CATALOG[organization.scheduledPlanChange.planKey].name} credits`}
                            effectiveAt={
                              organization.scheduledPlanChange.effectiveAt
                            }
                          />
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center">
                        <PartnerModelSelect
                          aria-label={`Model for ${organization.name}`}
                          compact
                          value={organization.modelId}
                          models={models}
                          onValueChange={(modelId) => {
                            if (modelId !== organization.modelId) {
                              onEntitlementsChange(organization, { modelId });
                            }
                          }}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-center gap-1">
                        <PartnerLimitInput
                          aria-label={`Agents for ${organization.name}`}
                          compact
                          key={`agents-${organization.maxAgents}-${organization.scheduledMaxAgents?.value ?? "none"}-${limitInputEpoch}`}
                          value={organization.maxAgents}
                          onCommit={(maxAgents) =>
                            onEntitlementsChange(organization, { maxAgents })
                          }
                        />
                        {organization.scheduledMaxAgents ? (
                          <PartnerScheduledNote
                            value={organization.scheduledMaxAgents.value.toLocaleString()}
                            effectiveAt={
                              organization.scheduledMaxAgents.effectiveAt
                            }
                          />
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-center gap-1">
                        <PartnerLimitInput
                          aria-label={`Monthly credits for ${organization.name}`}
                          compact
                          key={`monthly-${organization.monthlyAllowance}-${organization.scheduledMonthlyCredits?.value ?? "none"}-${limitInputEpoch}`}
                          value={organization.monthlyAllowance}
                          onCommit={(monthlyCredits) =>
                            setPendingChange({
                              kind: "monthly",
                              organization,
                              monthlyCredits,
                            })
                          }
                        />
                        {organization.scheduledMonthlyCredits ? (
                          <PartnerScheduledNote
                            value={organization.scheduledMonthlyCredits.value.toLocaleString()}
                            effectiveAt={
                              organization.scheduledMonthlyCredits.effectiveAt
                            }
                          />
                        ) : null}
                      </div>
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
        pendingChange={pendingChange}
        onCancel={closePendingChange}
        onConfirm={confirmChange}
      />
      <PartnerOrganizationDeleteDialog
        organization={pendingDeletion}
        isDeleting={isDeleting}
        onCancel={() => setPendingDeletion(null)}
        onConfirm={() => void confirmDeletion()}
      />
    </section>
  );
}
