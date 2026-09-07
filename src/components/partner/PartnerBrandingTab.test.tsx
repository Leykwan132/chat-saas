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
    name: "Acme Studio",
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

function render(partner: PartnerProfile) {
  return renderToStaticMarkup(
    <PartnerBrandingTab
      partner={partner}
      onNameSave={noop}
      onLogoChange={() => undefined}
      onCreateCustomHostname={noop}
      onConfirmOwnershipDns={noop}
      onConfirmDelegatedDcvDns={noop}
      onCheckCertificateAgain={noop}
      onConfirmCutoverDns={noop}
      onRestartCustomHostname={noop}
    />,
  );
}

describe("PartnerBrandingTab", () => {
  test("edits the brand name used on the sign-in page", () => {
    const markup = render(partnerWithDomain("ownership_checking"));

    expect(markup).toContain("Brand name");
    expect(markup).toContain('value="Acme Studio"');
    expect(markup).toContain("sign-in page");
  });

  test("shows a green check next to a connected domain without extra copy", () => {
    const markup = render(partnerWithDomain("connected"));

    expect(markup).toContain('aria-label="Connected"');
    expect(markup).toContain("text-emerald-600");
    expect(markup).toContain("app.partner.test");
    expect(markup).not.toContain("is connected");
  });

  test("prompts for DNS setup while the domain is not connected", () => {
    const markup = render(partnerWithDomain("ownership_checking"));

    expect(markup).not.toContain('aria-label="Connected"');
    expect(markup).toContain(
      "Connect a subdomain through the guided DNS setup.",
    );
  });
});
