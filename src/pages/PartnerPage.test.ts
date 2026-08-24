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

  test("shows the six core summary metrics without an Overview table", () => {
    for (const label of [
      "Customers",
      "Credits spent",
      "Credits top-up",
      "Starter plan",
      "Growth plan",
      "Business plan",
    ]) {
      expect(overviewSource).toContain(`label="${label}"`);
    }

    expect(overviewSource.match(/<Metric/g)).toHaveLength(6);
    expect(overviewSource).not.toContain('label="Credit grants"');
    expect(overviewSource).not.toContain('label="Highest spend"');
    expect(overviewSource).not.toContain('label="Biggest top-up"');
    expect(overviewSource).not.toContain('label="Most remaining"');
    expect(overviewSource).not.toContain("Customer overview");
    expect(portalOverviewSource).toContain("totalSpentCredits");
    expect(apiSource).toContain("totalSpentCredits: number");
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
    expect(customerControlsSource).toContain('className="capitalize text-sm"');
    expect(customerControlsSource.match(/className="text-sm"/g)).toHaveLength(
      4,
    );
  });

  test("separates organizations and customers below the customer operations", () => {
    expect(customerFormsSource).toContain('from "@/components/ui/dialog"');
    expect(customerFormsSource.match(/<DialogTrigger asChild>/g)).toHaveLength(
      3,
    );
    expect(customerFormsSource).toContain("Create organization");
    expect(customerFormsSource).toContain("Create customer");
    expect(customerFormsSource).toContain("Add credits");
    expect(customerFormsSource).toContain(
      'className="rounded-lg border border-border shadow-none ring-0"',
    );
    expect(customerListSource).toContain('from "@/components/ui/table"');
    expect(organizationListSource).toContain('from "@/components/ui/table"');
    expect(organizationListSource).toContain("Customers");
    expect(organizationListSource).toContain("customerCount");
    expect(customerListSource).toContain("Organization");
    expect(customerListSource).toContain("Invitation status");
    expect(customerListSource).toContain('from "@/components/ui/empty"');
    expect(customerListSource).toContain("<TableHeader>");
    expect(customerListSource).toContain("<TableBody>");
    expect(customerListSource).toContain(
      "<EmptyTitle>No customers yet</EmptyTitle>",
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
    expect(pageSource).toContain("pendingCustomerAction");
  });

  test("closes the organization dialog only after creation succeeds and confirms it", () => {
    expect(customerFormsSource).toMatch(
      /const \[isOrganizationDialogOpen, setIsOrganizationDialogOpen\]\s*=\s*useState\(false\);/,
    );
    expect(customerFormsSource).toContain("open={isOrganizationDialogOpen}");
    expect(customerFormsSource).toContain(
      "onOpenChange={setIsOrganizationDialogOpen}",
    );
    expect(customerFormsSource).toContain(
      "if (await onCreateOrganization()) {",
    );
    expect(customerFormsSource).toContain(
      "setIsOrganizationDialogOpen(false);",
    );
    expect(pageSource).toContain("toast.success(success);");
    expect(pageSource).toContain("return true;");
  });

  test("requires confirmation before applying a customer plan change", () => {
    expect(organizationListSource).toContain('from "@/components/ui/dialog"');
    expect(organizationListSource).toContain("Confirm plan change");
    expect(organizationListSource).toContain("formatRenewalDate");
    expect(organizationListSource).toContain('variant="ghost"');
    expect(organizationListSource).toContain("setPendingPlanChange({");
    expect(organizationListSource).toContain(
      "onPlanChange(pendingPlanChange.organization, pendingPlanChange.planKey);",
    );
    expect(apiSource).toContain("renewalAt: number;");
    expect(portalOverviewSource).toContain("renewalAt: v.number(),");
    expect(portalOverviewSource).toContain(
      "renewalAt: balance.period.periodEnd,",
    );
  });

  test("shows active organization status with a dot and confirms suspension", () => {
    expect(organizationListSource).toContain("bg-emerald-500");
    expect(organizationListSource).toContain('variant="destructive"');
    expect(organizationListSource).toContain("Suspend organization");
    expect(organizationListSource).toContain("setPendingSuspension(organization)");
  });

  test("returns invitation-backed customer rows and organization counts", () => {
    expect(apiSource).toContain("customerCount: number;");
    expect(apiSource).toContain("customers: Array<{");
    expect(portalOverviewSource).toContain("customerCount: v.number(),");
    expect(portalOverviewSource).toContain("customers: v.array(");
    expect(portalOverviewSource).toContain("teamInvitationRecords");
  });

  test("uses compact icon-first customer action buttons with descriptions and right arrows", () => {
    expect(customerFormsSource).toContain(
      '<div className="grid gap-4 sm:grid-cols-3">',
    );
    expect(customerFormsSource).toContain("ArrowRight");
    expect(customerFormsSource).toContain("Building2");
    expect(customerFormsSource).toContain("UserPlus");
    expect(customerFormsSource).toContain("WalletCards");
    expect(customerFormsSource.match(/h-36/g)).toHaveLength(3);
    expect(customerFormsSource.match(/px-6 py-5/g)).toHaveLength(3);
    expect(
      customerFormsSource.match(/has-data-\[icon=inline-start\]:pl-6/g),
    ).toHaveLength(3);
    expect(customerFormsSource).not.toContain("aspect-square");
    expect(customerFormsSource.match(/bottom-5 right-6/g)).toHaveLength(3);
    expect(customerFormsSource).toContain(
      "Start a workspace and choose its plan.",
    );
    expect(customerFormsSource).toContain("Invite someone to an organization.");
    expect(customerFormsSource).toContain("Top up a customer's balance.");
  });

  test("shows the selected plan inclusions below the organization plan field", () => {
    expect(customerFormsSource).toContain("PartnerPlanDetails");
    expect(customerFormsSource).toContain(
      "<PartnerPlanDetails planKey={organizationPlan} />",
    );
  });

  test("supports uploading a partner logo from Branding", () => {
    expect(pageSource).toContain("generateLogoUploadUrl");
    expect(apiSource).toContain("generateLogoUploadUrl");
    expect(portalSource).toContain("export const generateLogoUploadUrl");
    expect(portalSource).toContain(
      'logoStorageId: v.optional(v.id("_storage"))',
    );
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
