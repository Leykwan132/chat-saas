import { PartnerPanel } from "@/components/partner/PartnerPanel";
import { Badge } from "@/components/ui/badge";
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
import { type PartnerOverview } from "@/lib/whiteLabelApi";

export function PartnerCustomerList({
  customers,
}: {
  customers: PartnerOverview["customers"];
}) {
  return (
    <section className="mt-8 flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-base font-medium">Customers</h2>
        <p className="text-sm text-muted-foreground">
          Review invited and active customer accounts.
        </p>
      </div>
      {customers.length === 0 ? (
        <Empty className="rounded-lg border border-dashed bg-muted/20">
          <EmptyHeader>
            <EmptyTitle>No customers yet</EmptyTitle>
            <EmptyDescription>
              Invite a customer using the action above.
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
                  <TableHead>Organization</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Invitation status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow
                    key={`${customer.organizationName}-${customer.email}`}
                  >
                    <TableCell className="font-medium">
                      {customer.email}
                    </TableCell>
                    <TableCell>{customer.organizationName}</TableCell>
                    <TableCell className="capitalize">
                      {customer.role}
                    </TableCell>
                    <TableCell>
                      <Badge className="capitalize" variant="secondary">
                        {customer.invitationStatus}
                      </Badge>
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
