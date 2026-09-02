import { useState, type ChangeEventHandler } from "react";
import { Globe2 } from "lucide-react";
import { PartnerPanel } from "@/components/partner/PartnerPanel";
import { PartnerCustomDomainDialog } from "@/components/partner/PartnerCustomDomainDialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { type PartnerProfile } from "@/lib/whiteLabelApi";

function getDomainSetupButtonState(domain: PartnerProfile["domain"]) {
  const setupState = domain?.setupState;

  if (setupState === "connected") {
    return { isInProgress: false, label: "Custom domain connected" };
  }

  if (setupState === "failed") {
    return { isInProgress: false, label: "Domain setup needs attention" };
  }

  if (setupState && setupState !== "draft") {
    return { isInProgress: true, label: "DNS setup in progress" };
  }

  return { isInProgress: false, label: "Set up custom domain" };
}

export function PartnerBrandingTab({
  partner,
  onLogoChange,
  onCreateCustomHostname,
  onConfirmOwnershipDns,
  onConfirmDelegatedDcvDns,
  onCheckCertificateAgain,
  onConfirmCutoverDns,
  onRestartCustomHostname,
}: {
  partner: PartnerProfile;
  onLogoChange: ChangeEventHandler<HTMLInputElement>;
  onCreateCustomHostname: (hostname: string) => Promise<unknown>;
  onConfirmOwnershipDns: () => Promise<unknown>;
  onConfirmDelegatedDcvDns: () => Promise<unknown>;
  onCheckCertificateAgain: () => Promise<unknown>;
  onConfirmCutoverDns: () => Promise<unknown>;
  onRestartCustomHostname: () => Promise<unknown>;
}) {
  const [domainDialogOpen, setDomainDialogOpen] = useState(false);
  const domainSetupButtonState = getDomainSetupButtonState(partner.domain);

  return (
    <>
      <PartnerPanel className="max-w-xl">
        <CardHeader>
          <CardTitle>Branding</CardTitle>
          <CardDescription>
            Add the logo shown in your customer portal and configure its hostname.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-7">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="partner-logo">Logo</FieldLabel>
              <Input
                id="partner-logo"
                type="file"
                accept="image/*"
                onChange={onLogoChange}
              />
              <p className="text-sm text-muted-foreground">
                {partner.logoUrl
                  ? "A logo is currently configured."
                  : "No logo has been uploaded yet."}
              </p>
            </Field>
          </FieldGroup>
          <div>
            <Button
              variant="outline"
              className="w-fit"
              onClick={() => setDomainDialogOpen(true)}
            >
              {domainSetupButtonState.isInProgress ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <Globe2 data-icon="inline-start" />
              )}
              {domainSetupButtonState.label}
            </Button>
          </div>
        </CardContent>
      </PartnerPanel>
      <PartnerCustomDomainDialog
        open={domainDialogOpen}
        onOpenChange={setDomainDialogOpen}
        domain={partner.domain}
        onCreate={onCreateCustomHostname}
        onConfirmOwnership={onConfirmOwnershipDns}
        onConfirmDcv={onConfirmDelegatedDcvDns}
        onCheckCertificateAgain={onCheckCertificateAgain}
        onConfirmCutover={onConfirmCutoverDns}
        onRestart={onRestartCustomHostname}
      />
    </>
  );
}
