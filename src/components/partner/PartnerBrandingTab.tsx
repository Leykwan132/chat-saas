import { useState, type ChangeEventHandler } from "react";
import { Globe2 } from "lucide-react";
import { PartnerPanel } from "@/components/partner/PartnerPanel";
import { PartnerCustomDomainDialog } from "@/components/partner/PartnerCustomDomainDialog";
import { Button } from "@/components/ui/button";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { type PartnerProfile } from "@/lib/whiteLabelApi";

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
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <p className="font-medium">Custom domain</p>
              <p className="text-sm text-muted-foreground">
                {partner.domain?.setupState === "connected"
                  ? `${partner.domain.hostname} is connected.`
                  : "Connect a subdomain through the guided DNS setup."}
              </p>
            </div>
            <Button
              variant="outline"
              className="w-fit"
              onClick={() => setDomainDialogOpen(true)}
            >
              <Globe2 data-icon="inline-start" />
              Set up custom domain
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
