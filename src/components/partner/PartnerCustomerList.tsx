import { PartnerPlanSelect } from "@/components/partner/PartnerCustomerControls";
import { PartnerPanel } from "@/components/partner/PartnerPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
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
import { type PartnerOverview, type PlanKey } from "@/lib/whiteLabelApi";

export function PartnerCustomerList({
  organizations,
  onPlanChange,
  onStatusChange,
}: {
  organizations: PartnerOverview["organizations"];
  onPlanChange: (
    organization: PartnerOverview["organizations"][number],
    planKey: PlanKey,
  ) => void;
  onStatusChange: (
    organization: PartnerOverview["organizations"][number],
  ) => void;
}) {
  return (
    <section className="mt-8 flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-base font-medium">Customers</h2>
        <p className="text-sm text-muted-foreground">
          Manage plans, credits, and customer access.
        </p>
      </div>
      {organizations.length === 0 ? (
        <Empty className="rounded-lg border border-dashed bg-muted/20">
          <EmptyHeader>
            <EmptyTitle>No customers yet</EmptyTitle>
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
                  <TableHead>Customer</TableHead>
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
                    <TableCell>
                      <PartnerPlanSelect
                        value={organization.planKey}
                        onValueChange={(planKey) =>
                          onPlanChange(organization, planKey)
                        }
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
                      <Badge
                        variant={
                          organization.status === "active"
                            ? "secondary"
                            : "outline"
                        }
                        className="capitalize"
                      >
                        {organization.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onStatusChange(organization)}
                      >
                        {organization.status === "active"
                          ? "Suspend"
                          : "Reactivate"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </PartnerPanel>
      )}
    </section>
  );
}
