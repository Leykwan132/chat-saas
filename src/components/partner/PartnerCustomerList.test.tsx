import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { preventCustomerRowClick } from "./customerRemovalMenu";
import { PartnerCustomerList } from "./PartnerCustomerList";

test("renders customer values in the same order as the table headers", () => {
  const markup = renderToStaticMarkup(
    <PartnerCustomerList
      customers={[
        {
          partnerOrganizationId: "partner-organization",
          email: "customer@example.com",
          organizationName: "Example organization",
          role: "member",
          invitationStatus: "active",
          hasRetainedInitialPassword: true,
          workosUserId: "workos-user",
        },
      ]}
      onRemove={async () => true}
      onShowCredentials={async () => null}
      onRoleChange={async () => {}}
    />,
  );
  const cells = [...markup.matchAll(/<td[^>]*>(.*?)<\/td>/g)].map((match) =>
    match[1]!.replace(/<[^>]+>/g, ""),
  );

  expect(cells).toEqual([
    "customer@example.com",
    "Example organization",
    "",
    "active",
    "",
  ]);
  expect(markup).not.toContain("cursor-pointer");
});

test("clicking a customer menu action stops the table-row credentials action", () => {
  const event = new Event("click");

  preventCustomerRowClick(event);

  expect(event.cancelBubble).toBe(true);
});
