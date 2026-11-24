import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const pageSource =
  readFileSync(new URL("./PartnerPage.tsx", import.meta.url), "utf8") +
  readFileSync(
    new URL("../components/partner/PartnerCustomersTab.tsx", import.meta.url),
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
const organizationListSource =
  readFileSync(
    new URL(
      "../components/partner/PartnerOrganizationList.tsx",
      import.meta.url,
    ),
    "utf8",
  ) +
  readFileSync(
    new URL(
      "../components/partner/PartnerOrganizationTableHeader.tsx",
      import.meta.url,
    ),
    "utf8",
  ) +
  readFileSync(
    new URL(
      "../components/partner/PartnerOrganizationRow.tsx",
      import.meta.url,
    ),
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
  new URL(
    "../components/partner/PartnerCustomDomainDialog.tsx",
    import.meta.url,
  ),
  "utf8",
);
const customDomainStepSource = readFileSync(
  new URL("../components/partner/PartnerCustomDomainStep.tsx", import.meta.url),
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
  test("creates active user accounts and closes the dialog on success", () => {
    expect(pageSource).toContain("createCustomerAccount");
    expect(pageSource).toContain("User account created.");
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
    expect(customerActionSource).toContain(
      "Create an active account for an organization.",
    );
    expect(customerActionSource).toContain(
      "Top up an organization&apos;s balance.",
    );
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
    expect(customerControlsSource).toContain(
      '"w-28 min-w-0 overflow-hidden text-sm"',
    );
    expect(customerControlsSource).toContain(
      "h-8 w-28 px-2 text-center text-sm tabular-nums",
    );
    expect(pageSource).toContain("max-w-7xl");
    expect(organizationListSource).toContain("onEntitlementsChange");
    expect(organizationListSource).toContain("{ maxAgents }");
    expect(organizationListSource).not.toContain('kind: "agents"');
    expect(organizationListSource).toContain('kind: "monthly"');
    expect(organizationListSource).toContain("scheduledMonthlyCredits");
    expect(planChangeDialogSource).not.toContain("Confirm agents change");
    expect(planChangeDialogSource).toContain("Confirm monthly credits change");
    expect(planChangeDialogSource).toContain(
      'pendingChange.kind === "plan" ? "immediate" : "next_period"',
    );
    expect(pageSource).toContain("setOrganizationEntitlements");
    expect(pageSource).not.toContain(
      "Agent limit changes at the end of the billing period.",
    );
    expect(pageSource).toContain(
      "Monthly credits change at the end of the billing period.",
    );
    expect(pageSource).toContain("maxAgents");
    expect(pageSource).toContain("monthlyCredits");
    expect(pageSource).toContain("modelId");
    expect(apiSource).toContain("setOrganizationEntitlements");
    expect(apiSource).toContain("listEnabledAgentModels");
    expect(portalSource).toContain("export const setOrganizationEntitlements");
    expect(portalSource).toContain("export const listEnabledAgentModels");
    expect(portalOverviewSource).toContain("maxAgents: v.number(),");
    expect(portalOverviewSource).toContain("scheduledMaxAgents");
    expect(portalOverviewSource).toContain("scheduledMonthlyCredits");
    expect(apiSource).toContain("scheduledMaxAgents");
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
    expect(customDomainDialogSource).toContain(
      "rounded-md bg-muted px-3 py-1.5",
    );
    expect(apiSource).toContain("restartCustomHostname");
    expect(apiSource).toContain("checkCertificateAgain");
  });
});
