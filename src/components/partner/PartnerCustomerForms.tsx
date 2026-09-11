import { useState } from "react";
import { ArrowRight, UserPlus, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  PartnerOrganizationSelect,
  PartnerRoleSelect,
} from "@/components/partner/PartnerCustomerControls";
import { PartnerCreateOrganizationDialog } from "@/components/partner/PartnerCreateOrganizationDialog";
import {
  PartnerCustomerCredentialsDialog,
  type CustomerCredentials,
} from "@/components/partner/PartnerCustomerCredentialsDialog";
import { type PartnerOverview, type PlanKey } from "@/lib/whiteLabelApi";

export function PartnerCustomerForms({
  organizations,
  organizationName,
  organizationPlan,
  selectedOrganizationId,
  creditAmount,
  inviteEmail,
  inviteRole,
  onOrganizationNameChange,
  onOrganizationPlanChange,
  onSelectedOrganizationChange,
  onCreditAmountChange,
  onInviteEmailChange,
  onInviteRoleChange,
  onCreateOrganization,
  onCreateCustomer,
  onGiveCredits,
  isCreatingOrganization,
  isCreatingCustomer,
  isGivingCredits,
}: {
  organizations: PartnerOverview["organizations"];
  organizationName: string;
  organizationPlan: PlanKey;
  selectedOrganizationId: string;
  creditAmount: string;
  inviteEmail: string;
  inviteRole: "owner" | "admin" | "member";
  onOrganizationNameChange: (value: string) => void;
  onOrganizationPlanChange: (value: PlanKey) => void;
  onSelectedOrganizationChange: (value: string) => void;
  onCreditAmountChange: (value: string) => void;
  onInviteEmailChange: (value: string) => void;
  onInviteRoleChange: (value: "owner" | "admin" | "member") => void;
  onCreateOrganization: (limits: {
    maxAgents: number;
    monthlyCredits: number;
    modelId: string;
  }) => Promise<boolean>;
  onCreateCustomer: () => Promise<CustomerCredentials | null>;
  onGiveCredits: () => void;
  isCreatingOrganization: boolean;
  isCreatingCustomer: boolean;
  isGivingCredits: boolean;
}) {
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [isCreditDialogOpen, setIsCreditDialogOpen] = useState(false);
  const [customerCredentials, setCustomerCredentials] =
    useState<CustomerCredentials | null>(null);

  const handleCreateCustomer = async () => {
    const credentials = await onCreateCustomer();
    if (credentials) {
      setIsCustomerDialogOpen(false);
      setCustomerCredentials(credentials);
    }
  };

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
      <PartnerCreateOrganizationDialog
        organizationName={organizationName}
        organizationPlan={organizationPlan}
        isCreating={isCreatingOrganization}
        onOrganizationNameChange={onOrganizationNameChange}
        onOrganizationPlanChange={onOrganizationPlanChange}
        onCreate={onCreateOrganization}
      />

      <Dialog
        open={isCustomerDialogOpen}
        onOpenChange={setIsCustomerDialogOpen}
      >
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="relative h-36 w-full flex-col items-start justify-start gap-3 rounded-lg px-6 py-5 text-left shadow-none has-data-[icon=inline-start]:pl-6"
          >
            <UserPlus data-icon="inline-start" />
            <span className="font-heading text-base font-medium">
              Create user
            </span>
            <span className="max-w-48 text-sm text-muted-foreground whitespace-normal">
              Create an active account for an organization.
            </span>
            <ArrowRight
              data-icon="inline-end"
              className="absolute bottom-5 right-6"
            />
          </Button>
        </DialogTrigger>
        <DialogContent className="rounded-lg border border-border shadow-none ring-0">
          <DialogHeader>
            <DialogTitle>Create user</DialogTitle>
            <DialogDescription>
              Create an active user account for an organization.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="customer-organization">
                Organization
              </FieldLabel>
              <PartnerOrganizationSelect
                id="customer-organization"
                organizations={organizations}
                value={selectedOrganizationId}
                onValueChange={onSelectedOrganizationChange}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="customer-email">Email</FieldLabel>
              <Input
                id="customer-email"
                value={inviteEmail}
                onChange={(event) => onInviteEmailChange(event.target.value)}
                placeholder="name@company.com"
                type="email"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="customer-role">Role</FieldLabel>
              <PartnerRoleSelect
                value={inviteRole}
                onValueChange={onInviteRoleChange}
              />
            </Field>
          </FieldGroup>
          <DialogFooter className="justify-end gap-2">
            <Button
              disabled={isCreatingCustomer}
              variant="ghost"
              onClick={() => setIsCustomerDialogOpen(false)}
            >
              Close
            </Button>
            <Button
              disabled={!selectedOrganizationId || !inviteEmail.trim() || isCreatingCustomer}
              onClick={() => void handleCreateCustomer()}
            >
              {isCreatingCustomer ? <Spinner data-icon="inline-start" /> : null}
              Create user
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreditDialogOpen} onOpenChange={setIsCreditDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="relative h-36 w-full flex-col items-start justify-start gap-3 rounded-lg px-6 py-5 text-left shadow-none has-data-[icon=inline-start]:pl-6"
          >
            <WalletCards data-icon="inline-start" />
            <span className="font-heading text-base font-medium">
              Add credits
            </span>
            <span className="max-w-48 text-sm text-muted-foreground whitespace-normal">
              Top up an organization&apos;s balance.
            </span>
            <ArrowRight
              data-icon="inline-end"
              className="absolute bottom-5 right-6"
            />
          </Button>
        </DialogTrigger>
        <DialogContent className="rounded-lg border border-border shadow-none ring-0">
          <DialogHeader>
            <DialogTitle>Add credits</DialogTitle>
            <DialogDescription>
              Add manual credits to an organization.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="credit-organization">
                Organization
              </FieldLabel>
              <PartnerOrganizationSelect
                id="credit-organization"
                organizations={organizations}
                value={selectedOrganizationId}
                onValueChange={onSelectedOrganizationChange}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="credit-amount">Credits</FieldLabel>
              <Input
                id="credit-amount"
                value={creditAmount}
                onChange={(event) => onCreditAmountChange(event.target.value)}
                placeholder="Credits to add"
                inputMode="numeric"
              />
            </Field>
          </FieldGroup>
          <DialogFooter className="justify-end gap-2">
            <Button
              disabled={isGivingCredits}
              variant="ghost"
              onClick={() => setIsCreditDialogOpen(false)}
            >
              Close
            </Button>
            <Button
              disabled={!selectedOrganizationId || Number(creditAmount) <= 0 || isGivingCredits}
              onClick={onGiveCredits}
            >
              {isGivingCredits ? <Spinner data-icon="inline-start" /> : null}
              Add credits
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
      <PartnerCustomerCredentialsDialog
        credentials={customerCredentials}
        onClose={() => setCustomerCredentials(null)}
      />
    </>
  );
}
