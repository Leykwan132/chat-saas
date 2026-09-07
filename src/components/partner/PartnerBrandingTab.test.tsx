import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
import { PartnerBrandingTab } from "./PartnerBrandingTab";
import type { PartnerProfile } from "@/lib/whiteLabelApi";

const noop = vi.fn(async () => null);

function partnerWithDomain(
  setupState: NonNullable<PartnerProfile["domain"]>["setupState"],
  logoUrl: string | null = null,
): PartnerProfile {
  return {
    partnerId: "partner_123",
    name: "Acme Studio",
    logoStorageId: logoUrl === null ? null : "storage_1",
    logoUrl,
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
      previewUrl:
        setupState === "connected" ? "https://app.partner.test" : null,
    },
  };
}

function render(partner: PartnerProfile) {
  return renderToStaticMarkup(
    <PartnerBrandingTab
      partner={partner}
      onNameSave={noop}
      onLogoUpload={noop}
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

  test("previews an uploaded logo behind a click-to-replace overlay", () => {
    const markup = render(
      partnerWithDomain("ownership_checking", "https://cdn.test/logo.png"),
    );

    expect(markup).toContain('src="https://cdn.test/logo.png"');
    expect(markup).toContain("Replace logo");
    expect(markup).toContain("group-hover:opacity-100");
    expect(markup).toContain('for="partner-logo"');
    expect(markup).toContain("cursor-pointer");
    expect(markup).not.toContain("Upload logo");
  });

  test("prompts for a first logo upload when none exists", () => {
    const markup = render(partnerWithDomain("ownership_checking"));

    expect(markup).toContain("Upload logo");
    expect(markup).not.toContain("Replace logo");
  });

  test("links to the live sign-in page once the domain is connected", () => {
    const markup = render(partnerWithDomain("connected"));

    expect(markup).toContain("Preview:");
    expect(markup).toContain('href="https://app.partner.test/sign-in"');
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain("https://app.partner.test/sign-in</a>");
  });

  test("hides the sign-in preview link until the domain is connected", () => {
    const markup = render(partnerWithDomain("cutover_pending"));

    expect(markup).not.toContain("Preview:");
    expect(markup).not.toContain("/sign-in");
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
