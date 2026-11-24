import { PartnerCustomerModeControl } from "./PartnerCustomerModeControl";
import { useRef, useState } from "react";
import { KeyRound, MoreHorizontal, Trash2 } from "lucide-react";
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
import {
  type CustomerCredentials,
  PartnerCustomerCredentialsDialog,
} from "@/components/partner/PartnerCustomerCredentialsDialog";
import { PartnerCustomerRoleControl } from "@/components/partner/PartnerCustomerRoleControl";
import {
  type PartnerCustomerRemoval,
  type PartnerOverview,
} from "@/lib/whiteLabelApi";
import { preventCustomerRowClick } from "./customerRemovalMenu";

type Customer = PartnerOverview["customers"][number];

function removalForCustomer(customer: Customer): PartnerCustomerRemoval | null {
  if (
    customer.invitationStatus === "active" &&
    customer.workosUserId &&
    customer.workosOrganizationMembershipId
  ) {
    return {
      kind: "active",
      workosUserId: customer.workosUserId,
      workosOrganizationMembershipId: customer.workosOrganizationMembershipId,
    };
  }
  if (customer.invitationStatus === "pending" && customer.workosInvitationId) {
    return { kind: "pending", workosInvitationId: customer.workosInvitationId };
  }
  if (
    customer.invitationStatus === "accepted" &&
    customer.workosInvitationId &&
    customer.workosUserId
  ) {
    return {
      kind: "accepted",
      workosInvitationId: customer.workosInvitationId,
      workosUserId: customer.workosUserId,
    };
  }
  return null;
}

export function PartnerCustomerList({
  customers,
  embedded = false,
  onRemove,
  onShowCredentials,
  onRoleChange,
}: {
  customers: PartnerOverview["customers"];
  embedded?: boolean;
  onRemove: (
    partnerOrganizationId: string,
    removal: PartnerCustomerRemoval,
  ) => Promise<boolean>;
  onShowCredentials: (
    partnerOrganizationId: string,
    workosUserId: string,
  ) => Promise<CustomerCredentials | null>;
  onRoleChange: (customer: Customer, role: Customer["role"]) => Promise<void>;
}) {
  const [pendingCustomer, setPendingCustomer] = useState<Customer | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [credentials, setCredentials] = useState<CustomerCredentials | null>(
    null,
  );
  const [isCredentialsLoading, setIsCredentialsLoading] = useState(false);
  const credentialsRequestId = useRef(0);

  const confirmRemoval = async () => {
    if (pendingCustomer === null) return;
    const removal = removalForCustomer(pendingCustomer);
    if (removal === null) return;
    setIsRemoving(true);
    try {
      if (await onRemove(pendingCustomer.partnerOrganizationId, removal)) {
        setPendingCustomer(null);
      }
    } finally {
      setIsRemoving(false);
    }
  };

  const showCredentials = async (customer: Customer) => {
    if (!customer.hasRetainedInitialPassword || !customer.workosUserId) return;
    const requestId = credentialsRequestId.current + 1;
    credentialsRequestId.current = requestId;
    setCredentials(null);
    setIsCredentialsLoading(true);
    const nextCredentials = await onShowCredentials(
      customer.partnerOrganizationId,
      customer.workosUserId,
    );
    if (credentialsRequestId.current !== requestId) return;
    setCredentials(nextCredentials);
    setIsCredentialsLoading(false);
  };

  const closeCredentials = () => {
    credentialsRequestId.current += 1;
    setCredentials(null);
    setIsCredentialsLoading(false);
  };

  return (
    <section
      className={embedded ? "flex flex-col" : "mt-8 flex flex-col gap-4"}
    >
      {customers.length === 0 ? (
        <Empty
          className={
            embedded
              ? "rounded-none border-0 bg-muted/20"
              : "rounded-lg border border-dashed bg-muted/20"
          }
        >
          <EmptyHeader>
            <EmptyTitle>No users yet</EmptyTitle>
            <EmptyDescription>
              Create a user account using the action above.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <PartnerPanel
          className={
            embedded
              ? "gap-0 overflow-hidden rounded-none border-0 py-0"
              : "gap-0 overflow-hidden py-0"
          }
        >
          <CardContent className="px-0">
            <Table>
              <TableHeader className="bg-muted [&_th]:font-semibold [&_th]:text-foreground">
                <TableRow>
                  <TableHead>User</TableHead>
                  {!embedded && <TableHead>Organization</TableHead>}
                  <TableHead>Role</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
                    {!embedded && (
                      <TableCell>{customer.organizationName}</TableCell>
                    )}
                    <TableCell>
                      <PartnerCustomerRoleControl
                        customer={customer}
                        onRoleChange={onRoleChange}
                      />
                    </TableCell>
                    <TableCell>
                      <PartnerCustomerModeControl customer={customer} />
                    </TableCell>
                    <TableCell>
                      <Badge className="gap-1.5 capitalize" variant="secondary">
                        {customer.invitationStatus === "active" ? (
                          <span className="size-1.5 rounded-full bg-emerald-500" />
                        ) : customer.invitationStatus === "pending" ? (
                          <span className="size-1.5 rounded-full bg-amber-500" />
                        ) : null}
                        {customer.invitationStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {removalForCustomer(customer) ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              aria-label={`User actions for ${customer.email}`}
                              size="icon"
                              variant="ghost"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            className="rounded-md"
                            align="end"
                            onClick={preventCustomerRowClick}
                          >
                            {customer.hasRetainedInitialPassword &&
                            customer.workosUserId ? (
                              <DropdownMenuItem
                                onSelect={() => void showCredentials(customer)}
                              >
                                <KeyRound />
                                Show password
                              </DropdownMenuItem>
                            ) : null}
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onSelect={() => setPendingCustomer(customer)}
                            >
                              <Trash2 />
                              Delete user
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </PartnerPanel>
      )}
      <Dialog
        open={pendingCustomer !== null}
        onOpenChange={(open) => {
          if (!open) setPendingCustomer(null);
        }}
      >
        <DialogContent className="rounded-lg border border-border shadow-none ring-0">
          <DialogHeader>
            <DialogTitle>Delete user</DialogTitle>
            <DialogDescription>
              Remove {pendingCustomer?.email} from this organization? Their
              WorkOS account will remain available elsewhere.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              disabled={isRemoving}
              variant="ghost"
              onClick={() => setPendingCustomer(null)}
            >
              Cancel
            </Button>
            <Button
              disabled={isRemoving}
              variant="destructive"
              onClick={() => void confirmRemoval()}
            >
              {isRemoving ? <Spinner data-icon="inline-start" /> : null}
              Delete user
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <PartnerCustomerCredentialsDialog
        credentials={credentials}
        isLoading={isCredentialsLoading}
        onClose={closeCredentials}
      />
    </section>
  );
}
