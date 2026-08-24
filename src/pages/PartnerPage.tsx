import { useState, type ChangeEvent } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { LayoutDashboard, Palette, Users } from "lucide-react";
import { toast } from "sonner";
import { PartnerBrandingTab } from "@/components/partner/PartnerBrandingTab";
import { PartnerCustomerForms } from "@/components/partner/PartnerCustomerForms";
import { PartnerCustomerList } from "@/components/partner/PartnerCustomerList";
import { PartnerOrganizationList } from "@/components/partner/PartnerOrganizationList";
import { PartnerOverviewTab } from "@/components/partner/PartnerOverviewTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type PlanKey, whiteLabelApi } from "@/lib/whiteLabelApi";

type CustomerAction =
  | "organization"
  | "customer"
  | "credits"
  | "customerDeletion"
  | "organizationDeletion";

export default function PartnerPage() {
  const partner = useQuery(whiteLabelApi.portal.getCurrentPartner);
  const overview = useQuery(
    whiteLabelApi.portal.getOverview,
    partner ? {} : "skip",
  );
  const createOrganization = useAction(
    whiteLabelApi.actions.createOrganization,
  );
  const createCustomerAccount = useAction(
    whiteLabelApi.actions.createCustomerAccount,
  );
  const grantCredits = useMutation(whiteLabelApi.portal.grantCredits);
  const assignPlan = useMutation(whiteLabelApi.portal.assignOrganizationPlan);
  const deletePartnerOrganization = useMutation(
    whiteLabelApi.portal.deletePartnerOrganization,
  );
  const removeCustomerFromOrganization = useAction(
    whiteLabelApi.actions.removeCustomerFromOrganization,
  );
  const getCustomerInitialCredentials = useAction(
    whiteLabelApi.actions.getCustomerInitialCredentials,
  );
  const generateLogoUploadUrl = useMutation(
    whiteLabelApi.portal.generateLogoUploadUrl,
  );
  const updateBrand = useMutation(whiteLabelApi.portal.updateBranding);
  const createCustomHostname = useAction(whiteLabelApi.customHostnames.create);
  const restartCustomHostname = useAction(whiteLabelApi.customHostnames.restart);
  const confirmOwnershipDns = useMutation(
    whiteLabelApi.customHostnames.confirmOwnershipDns,
  );
  const confirmDelegatedDcvDns = useMutation(
    whiteLabelApi.customHostnames.confirmDelegatedDcvDns,
  );
  const checkCertificateAgain = useMutation(
    whiteLabelApi.customHostnames.checkCertificateAgain,
  );
  const confirmCutoverDns = useMutation(
    whiteLabelApi.customHostnames.confirmCutoverDns,
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

  if (partner === undefined) {
    return <PortalState>Loading partner portal…</PortalState>;
  }

  if (partner === null) {
    return (
      <PortalState>
        Partner access is not available in this workspace.
      </PortalState>
    );
  }

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

  const uploadLogo = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    void run(async () => {
      if (!file.type.startsWith("image/")) {
        throw new Error("Choose an image file for the logo.");
      }
      const uploadUrl = await generateLogoUploadUrl({});
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!response.ok) throw new Error("Logo upload failed.");
      const result = (await response.json()) as { storageId: string };
      await updateBrand({ name: partner.name, logoStorageId: result.storageId });
    }, "Logo updated.");
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
    <main className="mx-auto w-full max-w-6xl p-5 sm:p-8">
      <div className="flex flex-col gap-2 sm:pl-48">
        <h1 className="text-3xl font-semibold tracking-tight">
          Partner Programme
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage customer organizations, customer accounts, credits, and your
          portal branding.
        </p>
      </div>
      <Tabs
        defaultValue="overview"
        orientation="vertical"
        className="mt-8 gap-8"
      >
        <TabsList className="w-40 shrink-0 items-stretch rounded-none bg-transparent p-0">
          <TabsTrigger
            value="overview"
            className="rounded-md px-3 py-2.5 text-muted-foreground data-active:bg-transparent data-active:font-semibold data-active:text-foreground after:hidden hover:bg-accent hover:text-foreground"
          >
            <LayoutDashboard data-icon="inline-start" />
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="customers"
            className="rounded-md px-3 py-2.5 text-muted-foreground data-active:bg-transparent data-active:font-semibold data-active:text-foreground after:hidden hover:bg-accent hover:text-foreground"
          >
            <Users data-icon="inline-start" />
            Customers
          </TabsTrigger>
          <TabsTrigger
            value="branding"
            className="rounded-md px-3 py-2.5 text-muted-foreground data-active:bg-transparent data-active:font-semibold data-active:text-foreground after:hidden hover:bg-accent hover:text-foreground"
          >
            <Palette data-icon="inline-start" />
            Branding
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <PartnerOverviewTab overview={overview} />
        </TabsContent>
        <TabsContent value="customers">
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
            onCreateOrganization={async () =>
              (await runCustomerAction(
                "organization",
                async () => {
                  await createOrganization({
                    name: organizationName,
                    planKey: organizationPlan,
                  });
                  setOrganizationName("");
                },
                "Customer organization created.",
              )) !== null
            }
            onCreateCustomer={() =>
              runCustomerAction("customer", async () => {
                const customer = await createCustomerAccount({
                  partnerOrganizationId:
                    selectedOrganization!.partnerOrganizationId,
                  email: inviteEmail,
                  role: inviteRole,
                });
                setInviteEmail("");
                return customer;
              }, "Customer account created.")
            }
            onGiveCredits={() =>
              void runCustomerAction("credits", async () => {
                await grantCredits({
                  partnerOrganizationId:
                    selectedOrganization!.partnerOrganizationId,
                  credits: Number(creditAmount),
                });
                setCreditAmount("");
              }, "Credits added to this customer.")
            }
          />
          <PartnerOrganizationList
            organizations={organizations}
            onPlanChange={(organization, planKey) =>
              void run(
                () =>
                  assignPlan({
                    partnerOrganizationId: organization.partnerOrganizationId,
                    planKey,
                  }),
                "Plan updated. Monthly credits change on the next cycle.",
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
          />
          <PartnerCustomerList
            customers={overview?.customers ?? []}
            onRemove={async (partnerOrganizationId, removal) =>
              (await runCustomerAction(
                "customerDeletion",
                () =>
                  removeCustomerFromOrganization({
                    partnerOrganizationId,
                    removal,
                  }),
                "Customer removed from organization.",
              )) !== null
            }
            onShowCredentials={(partnerOrganizationId, workosUserId) =>
              runCustomerAction(
                "customer",
                () =>
                  getCustomerInitialCredentials({
                    partnerOrganizationId,
                    workosUserId,
                  }),
                "Customer credentials loaded.",
              )
            }
          />
        </TabsContent>
        <TabsContent value="branding">
          <PartnerBrandingTab
            partner={partner}
            onLogoChange={uploadLogo}
            onCreateCustomHostname={(hostname) =>
              run(
                () => createCustomHostname({ hostname }),
                "Custom hostname created. Add the ownership record to continue.",
              )
            }
            onConfirmOwnershipDns={() =>
              run(
                () => confirmOwnershipDns({}),
                "Checking ownership DNS.",
              )
            }
            onConfirmDelegatedDcvDns={() =>
              run(
                () => confirmDelegatedDcvDns({}),
                "Checking certificate DNS.",
              )
            }
            onCheckCertificateAgain={() =>
              run(
                () => checkCertificateAgain({}),
                "Checking certificate readiness again.",
              )
            }
            onConfirmCutoverDns={() =>
              run(
                () => confirmCutoverDns({}),
                "Checking your custom domain connection.",
              )
            }
            onRestartCustomHostname={() =>
              run(
                () => restartCustomHostname({}),
                "Custom hostname removed. You can enter a new domain.",
              )
            }
          />
        </TabsContent>
      </Tabs>
    </main>
  );
}

function PortalState({ children }: { children: string }) {
  return <main className="p-8 text-sm text-muted-foreground">{children}</main>;
}
