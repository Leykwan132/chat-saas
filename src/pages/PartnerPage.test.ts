import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const pageSource =
  readFileSync(new URL("./PartnerPage.tsx", import.meta.url), "utf8") +
  readFileSync(
    new URL("../components/partner/PartnerCustomersTab.tsx", import.meta.url),
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
const brandingSource = readFileSync(
  new URL("../components/partner/PartnerBrandingTab.tsx", import.meta.url),
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
    expect(customerListSource).toContain("<TableHeader className=");
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
    expect(customerListSource).toContain("<TableHeader className=");
    expect(customerListSource).toContain("<TableBody>");
    expect(customerListSource).toContain(
      "<EmptyTitle>No users yet</EmptyTitle>",
    );
    expect(pageSource.indexOf("<PartnerCustomerForms")).toBeLessThan(
      pageSource.indexOf("<PartnerOrganizationList"),
    );
    expect(pageSource).not.toContain("<PartnerCustomerList");
    expect(organizationListSource).toContain("<PartnerCustomerList");
    expect(organizationListSource).toContain(
      "customer.partnerOrganizationId === organizationId",
    );
  });
});
