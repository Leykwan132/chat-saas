import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { PartnerCustomerRoleControl } from "./PartnerCustomerRoleControl";

const activeCustomer = {
  partnerOrganizationId: "partner-organization",
  email: "customer@example.com",
  organizationName: "Example organization",
  role: "member" as const,
  invitationStatus: "active" as const,
  hasRetainedInitialPassword: true,
  workosUserId: "workos-user",
};

test("shows a role dropdown only for active customer accounts", () => {
  const activeMarkup = renderToStaticMarkup(
    <PartnerCustomerRoleControl
      customer={activeCustomer}
      onRoleChange={async () => {}}
    />,
  );
  const pendingMarkup = renderToStaticMarkup(
    <PartnerCustomerRoleControl
      customer={{ ...activeCustomer, invitationStatus: "pending" }}
      onRoleChange={async () => {}}
    />,
  );

  expect(activeMarkup).toContain('data-slot="select-trigger"');
  expect(pendingMarkup).not.toContain('data-slot="select-trigger"');
  expect(pendingMarkup).toContain("member");
});
