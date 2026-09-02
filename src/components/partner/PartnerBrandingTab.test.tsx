import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
import { PartnerBrandingTab } from "./PartnerBrandingTab";
import type { PartnerProfile } from "@/lib/whiteLabelApi";

const noop = vi.fn(async () => null);

function partnerWithDomain(
  setupState: NonNullable<PartnerProfile["domain"]>["setupState"],
): PartnerProfile {
  return {
    partnerId: "partner_123",
    name: "Partner",
    logoStorageId: null,
    logoUrl: null,
    domain: {
      hostname: "app.partner.test",
      status: "pending",
      dnsTarget: null,
      setupState,
      ownershipRecord: null,
      delegatedDcvRecord: null,
      cutoverRecord: null,
      hostnameStatus: null,
      certificateStatus: null,
      validationError: null,
      previewUrl: null,
    },
  };
}

describe("PartnerBrandingTab", () => {
  test("shows DNS setup progress in the modal trigger", () => {
    const markup = renderToStaticMarkup(
      <PartnerBrandingTab
        partner={partnerWithDomain("ownership_checking")}
        onLogoChange={() => undefined}
        onCreateCustomHostname={noop}
        onConfirmOwnershipDns={noop}
        onConfirmDelegatedDcvDns={noop}
        onCheckCertificateAgain={noop}
        onConfirmCutoverDns={noop}
        onRestartCustomHostname={noop}
      />,
    );

    expect(markup).toContain("DNS setup in progress");
    expect(markup).not.toContain("Custom domain");
    expect(markup).not.toContain(
      "Connect a subdomain through the guided DNS setup.",
    );
  });
});
