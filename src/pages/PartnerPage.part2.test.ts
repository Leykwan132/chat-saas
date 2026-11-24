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
const organizationDeleteDialogSource = readFileSync(
  new URL(
    "../components/partner/PartnerOrganizationDeleteDialog.tsx",
    import.meta.url,
  ),
  "utf8",
);
const planChangeDialogSource = readFileSync(
  new URL("../components/partner/PartnerPlanChangeDialog.tsx", import.meta.url),
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
  test("shows loading feedback while customer operations are submitted", () => {
    expect(customerFormsSource).toContain('from "@/components/ui/spinner"');
    expect(customerFormsSource).toContain("isCreatingOrganization");
    expect(customerFormsSource).toContain("isCreatingCustomer");
    expect(customerFormsSource).toContain("isGivingCredits");
    expect(customerFormsSource).toContain(
      '<Spinner data-icon="inline-start" />',
    );
    expect(createOrganizationSource).toContain(
      '<Spinner data-icon="inline-start" />',
    );
    expect(pageSource).toContain("pendingCustomerAction");
  });

  test("closes the organization dialog only after creation succeeds and confirms it", () => {
    expect(createOrganizationSource).toContain(
      "const [open, setOpen] = useState(false);",
    );
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
    expect(organizationListSource).toContain("setPendingChange({");
    expect(organizationListSource).toContain(
      "organization.scheduledPlanChange",
    );
    expect(organizationListSource).toContain(
      "PLAN_CATALOG[organization.scheduledPlanChange.planKey].name",
    );
    expect(planChangeDialogSource).toContain("getPlanLimitChanges");
    expect(planChangeDialogSource).toContain('className="sr-only"');
    expect(planChangeDialogSource).toContain('{" -> "}');
    expect(planChangeDialogSource).toContain("text-emerald-600");
    expect(planChangeDialogSource).toContain("text-destructive");
    expect(planChangeDialogSource).toContain('from "@/components/ui/dialog"');
    expect(planChangeDialogSource).toContain(
      'from "@/components/ui/radio-group"',
    );
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
    expect(organizationDeleteDialogSource).toContain('variant="destructive"');
    expect(organizationListSource).toContain("Delete organization");
    expect(organizationListSource).toContain(
      "setPendingDeletion(organization)",
    );
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
});
