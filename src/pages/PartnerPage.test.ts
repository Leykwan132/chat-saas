import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const pageSource = readFileSync(
  new URL("./PartnerPage.tsx", import.meta.url),
  "utf8",
);
const overviewSource = readFileSync(
  new URL("../components/partner/PartnerOverviewTab.tsx", import.meta.url),
  "utf8",
);
const customerFormsSource = readFileSync(
  new URL("../components/partner/PartnerCustomerForms.tsx", import.meta.url),
  "utf8",
);
const createOrganizationSource = readFileSync(
  new URL(
    "../components/partner/PartnerCreateOrganizationDialog.tsx",
    import.meta.url,
  ),
  "utf8",
);
const customerActionSource = customerFormsSource + createOrganizationSource;
const customerListSource = readFileSync(
  new URL("../components/partner/PartnerCustomerList.tsx", import.meta.url),
  "utf8",
);
const organizationListSource = readFileSync(
  new URL("../components/partner/PartnerOrganizationList.tsx", import.meta.url),
  "utf8",
);
const customerControlsSource = readFileSync(
  new URL("../components/partner/PartnerCustomerControls.tsx", import.meta.url),
  "utf8",
);
const planChangeDialogSource = readFileSync(
  new URL("../components/partner/PartnerPlanChangeDialog.tsx", import.meta.url),
  "utf8",
);
const brandingSource = readFileSync(
  new URL("../components/partner/PartnerBrandingTab.tsx", import.meta.url),
  "utf8",
);
const customDomainDialogSource = readFileSync(
  new URL("../components/partner/PartnerCustomDomainDialog.tsx", import.meta.url),
  "utf8",
);
const customDomainStepSource = readFileSync(
  new URL("../components/partner/PartnerCustomDomainStep.tsx", import.meta.url),
  "utf8",
);
const panelSource = readFileSync(
  new URL("../components/partner/PartnerPanel.tsx", import.meta.url),
  "utf8",
);
const apiSource = readFileSync(
  new URL("../lib/whiteLabelApi.ts", import.meta.url),
  "utf8",
);
const portalSource = readFileSync(
  new URL("../../convex/whiteLabel/portal.ts", import.meta.url),
  "utf8",
);
const portalOverviewSource = readFileSync(
  new URL("../../convex/whiteLabel/portalOverview.ts", import.meta.url),
  "utf8",
);
const teamDeletionLocalSource = readFileSync(
  new URL("../../convex/teamDeletion/local.ts", import.meta.url),
  "utf8",
);

describe("Partner Programme", () => {
  test("uses the three approved sections with the customer table only in Customers", () => {
    expect(pageSource).toContain("Partner Programme");
    expect(pageSource).toContain('value="overview"');
    expect(pageSource).toContain('value="customers"');
    expect(pageSource).toContain('value="branding"');
    expect(pageSource).not.toContain('<TabsTrigger value="organizations">');
    expect(pageSource).not.toContain('<TabsTrigger value="accounts">');
    expect(overviewSource).not.toContain('from "@/components/ui/table"');
    expect(customerListSource).toContain('from "@/components/ui/table"');
    expect(customerListSource).toContain("<TableHeader>");
    expect(customerListSource).toContain("<TableBody>");
  });

  test("shows organization and user counts as separate Overview metrics", () => {
    for (const label of [
      "Organizations",
      "Users",
      "Credits spent",
      "Credits top-up",
      "Starter plan",
      "Growth plan",
      "Business plan",
    ]) {
      expect(overviewSource).toContain(`label="${label}"`);
    }

    expect(overviewSource).toContain(
      'label="Organizations" value={overview?.activeOrganizations}',
    );
    expect(overviewSource).toContain(
      'label="Users" value={overview?.customers.length}',
    );
    expect(overviewSource.match(/<Metric/g)).toHaveLength(7);
    expect(overviewSource).toContain("xl:grid-cols-4");
    expect(overviewSource).not.toContain('label="Credit grants"');
    expect(overviewSource).not.toContain('label="Highest spend"');
    expect(overviewSource).not.toContain('label="Biggest top-up"');
    expect(overviewSource).not.toContain('label="Most remaining"');
    expect(overviewSource).not.toContain("Customer overview");
    expect(portalOverviewSource).toContain("totalSpentCredits");
    expect(apiSource).toContain("totalSpentCredits: number");
  });

  test("uses skeletons instead of placeholder zeroes while overview data loads", () => {
    expect(overviewSource).toContain('from "@/components/ui/skeleton"');
    expect(overviewSource).toContain('<Skeleton className="h-7 w-12" />');
    expect(overviewSource).not.toContain("?? 0");
    expect(overviewSource).toContain("value: number | string | undefined;");
  });

  test("returns active organizations with the active status discriminator", () => {
    expect(portalOverviewSource).toContain('eq("status", "active")');
    expect(portalOverviewSource).toContain('status: "active" as const,');
  });

  test("uses ghost-style icon navigation without a side separator or active line", () => {
    expect(pageSource).toContain(
      '<div className="flex flex-col gap-2 sm:pl-48">',
    );
    expect(pageSource).toContain('orientation="vertical"');
    expect(pageSource).toContain('className="mt-8 gap-8"');
    expect(pageSource).toContain("LayoutDashboard");
    expect(pageSource).toContain("Users");
    expect(pageSource).toContain("Palette");
    expect(pageSource).toContain(
      '<LayoutDashboard data-icon="inline-start" />',
    );
    expect(pageSource).toContain('<Users data-icon="inline-start" />');
    expect(pageSource).toContain('<Palette data-icon="inline-start" />');
    expect(pageSource).toContain("after:hidden");
    expect(pageSource).not.toContain("border-r");
  });

  test("uses matching subtle bordered containers across every tab", () => {
    expect(panelSource).toContain(
      '"rounded-lg border border-border bg-card shadow-none ring-0"',
    );

    for (const source of [overviewSource, customerListSource, brandingSource]) {
      expect(source).toContain("PartnerPanel");
      expect(source).not.toContain("rounded-4xl");
      expect(source).not.toContain("shadow-md");
    }

    expect(customerFormsSource).toContain(
      'className="rounded-lg border border-border shadow-none ring-0"',
    );
  });

  test("keeps Partner Programme dropdown labels at the normal text size", () => {
    expect(customerControlsSource).toContain(
      'const fullWidthSelectClassName = "w-full text-sm"',
    );
    expect(customerControlsSource).toContain(
      'compact ? "w-28 text-sm" : fullWidthSelectClassName',
    );
    expect(customerControlsSource).toContain("{PLAN_CATALOG[plan].name}");
    expect(customerControlsSource).toContain(
      "<SelectValue>{PLAN_CATALOG[value].name}</SelectValue>",
    );
    expect(customerControlsSource.match(/className="text-sm"/g)).toHaveLength(
      6,
    );
  });

  test("separates organizations and users below the customer operations", () => {
    expect(customerActionSource).toContain('from "@/components/ui/dialog"');
    expect(customerActionSource.match(/<DialogTrigger asChild>/g)).toHaveLength(
      3,
    );
    expect(customerActionSource).toContain("Create organization");
    expect(customerActionSource).toContain("Create user");
    expect(customerActionSource).toContain("Add credits");
    expect(customerActionSource).toContain(
      'className="rounded-lg border border-border shadow-none ring-0"',
    );
    expect(customerListSource).toContain('from "@/components/ui/table"');
    expect(organizationListSource).toContain('from "@/components/ui/table"');
    expect(organizationListSource).toContain("Users");
    expect(organizationListSource).toContain("customerCount");
    expect(customerListSource).toContain("Organization");
    expect(customerListSource).toContain("<TableHead>Status</TableHead>");
    expect(customerListSource).toContain('from "@/components/ui/empty"');
    expect(customerListSource).toContain("<TableHeader>");
    expect(customerListSource).toContain("<TableBody>");
    expect(customerListSource).toContain(
      "<EmptyTitle>No users yet</EmptyTitle>",
    );
    expect(pageSource.indexOf("<PartnerCustomerForms")).toBeLessThan(
      pageSource.indexOf("<PartnerOrganizationList"),
    );
    expect(pageSource.indexOf("<PartnerOrganizationList")).toBeLessThan(
      pageSource.indexOf("<PartnerCustomerList"),
    );
  });

  test("shows loading feedback while customer operations are submitted", () => {
    expect(customerFormsSource).toContain('from "@/components/ui/spinner"');
    expect(customerFormsSource).toContain("isCreatingOrganization");
    expect(customerFormsSource).toContain("isCreatingCustomer");
    expect(customerFormsSource).toContain("isGivingCredits");
    expect(customerFormsSource).toContain('<Spinner data-icon="inline-start" />');
    expect(createOrganizationSource).toContain(
      '<Spinner data-icon="inline-start" />',
    );
    expect(pageSource).toContain("pendingCustomerAction");
  });

  test("closes the organization dialog only after creation succeeds and confirms it", () => {
    expect(createOrganizationSource).toContain("const [open, setOpen] = useState(false);");
    expect(createOrganizationSource).toContain("open={open}");
    expect(createOrganizationSource).toContain("setOpen(nextOpen)");
    expect(createOrganizationSource).toContain(
      "if (await onCreate({ maxAgents, monthlyCredits, modelId })) {",
    );
    expect(createOrganizationSource).toContain("setOpen(false);");
    expect(pageSource).toContain("toast.success(success);");
    expect(pageSource).toContain("return result;");
  });

  test("requires confirmation before applying a customer plan change", () => {
    expect(organizationListSource).toContain("PartnerPlanChangeDialog");
    expect(organizationListSource).toContain("setPendingPlanChange({");
    expect(organizationListSource).toContain("organization.scheduledPlanChange");
    expect(organizationListSource).toContain(
      "PLAN_CATALOG[organization.scheduledPlanChange.planKey].name",
    );
    expect(planChangeDialogSource).toContain("getPlanLimitChanges");
    expect(planChangeDialogSource).toContain("className=\"sr-only\"");
    expect(planChangeDialogSource).toContain('{" -> "}');
    expect(planChangeDialogSource).toContain("text-emerald-600");
    expect(planChangeDialogSource).toContain("text-destructive");
    expect(planChangeDialogSource).toContain('from "@/components/ui/dialog"');
    expect(planChangeDialogSource).toContain('from "@/components/ui/radio-group"');
    expect(planChangeDialogSource).toContain("Confirm plan change");
    expect(planChangeDialogSource).toContain("formatRenewalDate");
    expect(planChangeDialogSource).toContain('value="immediate"');
    expect(planChangeDialogSource).toContain('value="next_period"');
    expect(planChangeDialogSource).toContain(
      '<DialogFooter className="flex-row justify-end">',
    );
    expect(planChangeDialogSource).not.toContain(
      'DialogFooter className="sm:justify-between"',
    );
    expect(planChangeDialogSource).toContain("onConfirm(timing)");
    expect(pageSource).toContain("timing,");
    expect(portalSource).toContain("timing: planChangeTimingValidator");
    expect(apiSource).toContain("timing: PlanChangeTiming;");
    expect(apiSource).toContain("renewalAt: number;");
    expect(portalOverviewSource).toContain("renewalAt: v.number(),");
    expect(portalOverviewSource).toContain(
      "renewalAt: balance.period.periodEnd,",
    );
  });

  test("shows active organization status with a dot and confirms deletion", () => {
    expect(organizationListSource).toContain("bg-emerald-500");
    expect(organizationListSource).toContain('variant="destructive"');
    expect(organizationListSource).toContain("Delete organization");
    expect(organizationListSource).toContain("setPendingDeletion(organization)");
  });

  test("keeps the organization name left-aligned and other columns centered", () => {
    expect(
      organizationListSource.match(/<TableHead className="text-center">/g),
    ).toHaveLength(9);
    expect(organizationListSource).toContain(
      '<TableCell className="font-medium">',
    );
    expect(organizationListSource).toContain(
      '<div className="flex justify-center">',
    );
  });

  test("returns invitation-backed customer rows and organization counts", () => {
    expect(apiSource).toContain("customerCount: number;");
    expect(apiSource).toContain("customers: Array<{");
    expect(portalOverviewSource).toContain("customerCount: v.number(),");
    expect(portalOverviewSource).toContain("customers: v.array(");
    expect(portalOverviewSource).toContain("teamInvitationRecords");
  });

  test("merges direct active customer accounts with legacy invitations", () => {
    expect(apiSource).toContain('"pending" | "accepted" | "active"');
    expect(portalOverviewSource).toContain(
      "whiteLabelPartnerOrganizationAccounts",
    );
    expect(portalOverviewSource).toContain(
      'invitationStatus: "active" as const',
    );
    expect(portalOverviewSource).toContain("customerCount: customers.length");
  });

  test("shows pending customer invitations with a yellow status dot", () => {
    expect(customerListSource).toContain(
      'customer.invitationStatus === "pending"',
    );
    expect(customerListSource).toContain("bg-amber-500");
    expect(customerListSource).toContain("gap-1.5 capitalize");
  });

  test("creates active user accounts and closes the dialog on success", () => {
    expect(pageSource).toContain("createCustomerAccount");
    expect(pageSource).toContain(
      "User account created.",
    );
    expect(customerFormsSource).toContain("isCustomerDialogOpen");
    expect(customerListSource).toContain(
      'customer.invitationStatus === "active"',
    );
    expect(customerListSource).toContain("bg-emerald-500");
  });

  test("uses three-dot menus to confirm destructive user access removal", () => {
    expect(customerListSource).toContain("MoreHorizontal");
    expect(customerListSource).toContain("DropdownMenu");
    expect(customerListSource).toContain("Delete user");
    expect(organizationListSource).toContain("Delete organization");
    expect(organizationListSource).toContain("DropdownMenu");
    expect(pageSource).toContain("removeCustomerFromOrganization");
    expect(pageSource).toContain("deletePartnerOrganization");
    expect(teamDeletionLocalSource).toContain(
      "deleteWhiteLabelPartnerOrganizationPage",
    );
  });

  test("uses compact icon-first user action buttons with descriptions and right arrows", () => {
    expect(customerFormsSource).toContain(
      '<div className="grid gap-4 sm:grid-cols-3">',
    );
    expect(customerActionSource).toContain("ArrowRight");
    expect(customerActionSource).toContain("Building2");
    expect(customerActionSource).toContain("UserPlus");
    expect(customerActionSource).toContain("WalletCards");
    expect(customerActionSource.match(/h-36/g)).toHaveLength(3);
    expect(customerActionSource.match(/px-6 py-5/g)).toHaveLength(3);
    expect(
      customerActionSource.match(/has-data-\[icon=inline-start\]:pl-6/g),
    ).toHaveLength(3);
    expect(customerActionSource).not.toContain("aspect-square");
    expect(customerActionSource.match(/bottom-5 right-6/g)).toHaveLength(3);
    expect(customerActionSource).toContain(
      "Start a workspace and choose its plan.",
    );
    expect(customerActionSource).toContain("Create an active account for an organization.");
    expect(customerActionSource).toContain("Top up an organization&apos;s balance.");
  });

  test("shows the selected plan inclusions below the organization plan field", () => {
    expect(createOrganizationSource).toContain("PartnerPlanDetails");
    expect(createOrganizationSource).toContain(
      "<PartnerPlanDetails planKey={organizationPlan} />",
    );
  });

  test("lets partners set per-organization agent, credit, and model limits", () => {
    expect(createOrganizationSource).toContain("organization-agents");
    expect(createOrganizationSource).toContain("organization-credits");
    expect(createOrganizationSource).toContain("organization-model");
    expect(createOrganizationSource).toContain("override the selected plan");
    expect(organizationListSource).toContain("Agents");
    expect(organizationListSource).toContain("PartnerModelSelect");
    expect(organizationListSource).toContain("onEntitlementsChange");
    expect(pageSource).toContain("setOrganizationEntitlements");
    expect(pageSource).toContain("maxAgents");
    expect(pageSource).toContain("monthlyCredits");
    expect(pageSource).toContain("modelId");
    expect(apiSource).toContain("setOrganizationEntitlements");
    expect(apiSource).toContain("listEnabledAgentModels");
    expect(portalSource).toContain("export const setOrganizationEntitlements");
    expect(portalSource).toContain("export const listEnabledAgentModels");
    expect(portalOverviewSource).toContain("maxAgents: v.number(),");
    expect(portalOverviewSource).toContain("modelId: v.string(),");
    expect(planChangeDialogSource).toContain("includeAgents: false");
  });

  test("supports uploading a partner logo from Branding", () => {
    expect(pageSource).toContain("generateLogoUploadUrl");
    expect(apiSource).toContain("generateLogoUploadUrl");
    expect(portalSource).toContain("export const generateLogoUploadUrl");
    expect(portalSource).toContain(
      'logoStorageId: v.optional(v.id("_storage"))',
    );
    expect(portalSource).toContain("pageTitle: v.optional(v.string())");
    expect(pageSource).toContain("onPageTitleSave");
  });

  test("guides custom-domain setup through gated DNS confirmations", () => {
    expect(brandingSource).toContain("Set up custom domain");
    expect(customDomainDialogSource).toContain("Done");
    expect(customDomainDialogSource).toContain("Check again");
    expect(customDomainDialogSource).toContain(
      'domain?.setupState === "connected"',
    );
    expect(customDomainDialogSource).toContain("navigator.clipboard.writeText");
    expect(customDomainDialogSource).toContain("<Spinner");
    expect(customDomainDialogSource).toContain("Start over");
    expect(customDomainDialogSource).toContain("Confirm start over");
    expect(customDomainDialogSource).toContain("sm:max-w-5xl");
    expect(customDomainDialogSource).toContain("Done");
    expect(customDomainStepSource).toContain("Type");
    expect(customDomainStepSource).toContain("Name");
    expect(customDomainStepSource).toContain("Value");
    expect(customDomainStepSource).toContain("rounded-full bg-emerald-600");
    expect(customDomainStepSource).toContain(
      "sm:grid-cols-[max-content_minmax(0,1fr)_minmax(0,1fr)]",
    );
    expect(customDomainStepSource).toContain("Copy DNS {label}");
    expect(customDomainStepSource).toContain(
      "Add this record in your DNS provider for this domain, then select Done.",
    );
    expect(customDomainDialogSource).toContain("RotateCcw");
    expect(customDomainDialogSource).toContain("rounded-md bg-muted px-3 py-1.5");
    expect(apiSource).toContain("restartCustomHostname");
    expect(apiSource).toContain("checkCertificateAgain");
  });
});
