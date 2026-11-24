import { useState } from "react";
import { useAction, useMutation } from "convex/react";
import { toast } from "sonner";
import { PartnerCustomerForms } from "./PartnerCustomerForms";
import { PartnerOrganizationList } from "./PartnerOrganizationList";
import {
  type PartnerOverview,
  type PlanKey,
  whiteLabelApi,
} from "@/lib/whiteLabelApi";
import { completePartnerCustomerRemoval } from "@/lib/partnerCustomerRemoval";
type CustomerAction =
  | "organization"
  | "customer"
  | "credits"
  | "customerDeletion"
  | "organizationDeletion";

export function PartnerCustomersTab({
  overview,
}: {
  overview: PartnerOverview | undefined;
}) {
  const createOrganization = useAction(
    whiteLabelApi.actions.createOrganization,
  );
  const createCustomerAccount = useAction(
    whiteLabelApi.actions.createCustomerAccount,
  );
  const grantCredits = useMutation(whiteLabelApi.portal.grantCredits);
  const assignPlan = useMutation(whiteLabelApi.portal.assignOrganizationPlan);
  const setOrganizationEntitlements = useMutation(
    whiteLabelApi.portal.setOrganizationEntitlements,
  );
  const deletePartnerOrganization = useMutation(
    whiteLabelApi.portal.deletePartnerOrganization,
  );
  const removeCustomerFromOrganization = useAction(
    whiteLabelApi.actions.removeCustomerFromOrganization,
  );
  const getCustomerInitialCredentials = useAction(
    whiteLabelApi.actions.getCustomerInitialCredentials,
  );
  const updateCustomerAccountRole = useAction(
    whiteLabelApi.actions.updateCustomerAccountRole,
  );
  const [organizationName, setOrganizationName] = useState("");
  const [organizationPlan, setOrganizationPlan] = useState<PlanKey>("starter");
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("");
  const [creditAmount, setCreditAmount] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"owner" | "admin" | "member">(
    "member",
  );
  const [pendingCustomerAction, setPendingCustomerAction] =
    useState<CustomerAction | null>(null);

  const organizations = overview?.organizations ?? [];
  const selectedOrganization =
    organizations.find(
      (organization) =>
        organization.partnerOrganizationId === selectedOrganizationId,
    ) ?? organizations[0];

  const run = async <Result,>(work: () => Promise<Result>, success: string) => {
    try {
      const result = await work();
      toast.success(success);
      return result;
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to complete this request.",
      );
      return null;
    }
  };

  const runCustomerAction = async <Result,>(
    action: CustomerAction,
    work: () => Promise<Result>,
    success: string,
  ) => {
    setPendingCustomerAction(action);
    try {
      return await run(work, success);
    } finally {
      setPendingCustomerAction(null);
    }
  };

  return (
    <>
      <PartnerCustomerForms
        organizations={organizations}
        organizationName={organizationName}
        organizationPlan={organizationPlan}
        selectedOrganizationId={
          selectedOrganization?.partnerOrganizationId ?? ""
        }
        creditAmount={creditAmount}
        inviteEmail={inviteEmail}
        inviteRole={inviteRole}
        onOrganizationNameChange={setOrganizationName}
        onOrganizationPlanChange={setOrganizationPlan}
        onSelectedOrganizationChange={setSelectedOrganizationId}
        onCreditAmountChange={setCreditAmount}
        onInviteEmailChange={setInviteEmail}
        onInviteRoleChange={setInviteRole}
        isCreatingOrganization={pendingCustomerAction === "organization"}
        isCreatingCustomer={pendingCustomerAction === "customer"}
        isGivingCredits={pendingCustomerAction === "credits"}
        onCreateOrganization={async ({ maxAgents, monthlyCredits, modelId }) =>
          (await runCustomerAction(
            "organization",
            async () => {
              await createOrganization({
                name: organizationName,
                planKey: organizationPlan,
                maxAgents,
                monthlyCredits,
                modelId,
              });
              setOrganizationName("");
            },
            "Customer organization created.",
          )) !== null
        }
        onCreateCustomer={(interfaceMode) =>
          runCustomerAction(
            "customer",
            async () => {
              const customer = await createCustomerAccount({
                partnerOrganizationId:
                  selectedOrganization!.partnerOrganizationId,
                interfaceMode,
                email: inviteEmail,
                role: inviteRole,
              });
              setInviteEmail("");
              return customer;
            },
            "User account created.",
          )
        }
        onGiveCredits={() =>
          void runCustomerAction(
            "credits",
            async () => {
              await grantCredits({
                partnerOrganizationId:
                  selectedOrganization!.partnerOrganizationId,
                credits: Number(creditAmount),
              });
              setCreditAmount("");
            },
            "Credits added to this organization.",
          )
        }
      />
      <PartnerOrganizationList
        organizations={organizations}
        onPlanChange={(organization, planKey, timing) =>
          void run(
            () =>
              assignPlan({
                partnerOrganizationId: organization.partnerOrganizationId,
                planKey,
                timing,
              }),
            organization.hasCustomMonthlyCredits
              ? "Plan updated. Monthly credits stay as set for this organization."
              : timing === "immediate"
                ? "Plan updated. Monthly credits changed now."
                : "Plan updated. Monthly credits change at the end of the billing period.",
          )
        }
        onEntitlementsChange={(organization, entitlements, timing) =>
          void run(
            () =>
              setOrganizationEntitlements({
                partnerOrganizationId: organization.partnerOrganizationId,
                ...entitlements,
                ...(timing === undefined ? {} : { timing }),
              }),
            entitlements.maxAgents !== undefined
              ? "Agent limit updated."
              : entitlements.modelId !== undefined
                ? "Model updated."
                : timing === "next_period"
                  ? "Monthly credits change at the end of the billing period."
                  : "Monthly credits updated.",
          )
        }
        onDelete={async (organization) =>
          (await runCustomerAction(
            "organizationDeletion",
            () =>
              deletePartnerOrganization({
                partnerOrganizationId: organization.partnerOrganizationId,
              }),
            "Organization deletion started.",
          )) !== null
        }
        customerListProps={{
          customers: overview?.customers ?? [],
          onRemove: async (partnerOrganizationId, removal) =>
            (await runCustomerAction(
              "customerDeletion",
              () =>
                completePartnerCustomerRemoval(() =>
                  removeCustomerFromOrganization({
                    partnerOrganizationId,
                    removal,
                  }),
                ),
              "User removed from organization.",
            )) === true,
          onShowCredentials: (partnerOrganizationId, workosUserId) =>
            runCustomerAction(
              "customer",
              () =>
                getCustomerInitialCredentials({
                  partnerOrganizationId,
                  workosUserId,
                }),
              "Customer credentials loaded.",
            ),
          onRoleChange: async (customer, role) => {
            const workosUserId = customer.workosUserId;
            if (!workosUserId) return;
            await run(
              () =>
                updateCustomerAccountRole({
                  partnerOrganizationId: customer.partnerOrganizationId,
                  workosUserId,
                  role,
                }),
              "Customer role updated.",
            );
          },
        }}
      />
    </>
  );
}
