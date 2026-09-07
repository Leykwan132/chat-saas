import { useState, type ChangeEventHandler, type FormEvent } from "react";
import { CheckCircle2, Globe2 } from "lucide-react";
import { PartnerPanel } from "@/components/partner/PartnerPanel";
import { PartnerCustomDomainDialog } from "@/components/partner/PartnerCustomDomainDialog";
import { Button } from "@/components/ui/button";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { type PartnerProfile } from "@/lib/whiteLabelApi";

export function PartnerBrandingTab({
  partner,
  onNameSave,
  onLogoChange,
  onCreateCustomHostname,
  onConfirmOwnershipDns,
  onConfirmDelegatedDcvDns,
  onCheckCertificateAgain,
  onConfirmCutoverDns,
  onRestartCustomHostname,
}: {
  partner: PartnerProfile;
  onNameSave: (name: string) => Promise<unknown>;
  onLogoChange: ChangeEventHandler<HTMLInputElement>;
  onCreateCustomHostname: (hostname: string) => Promise<unknown>;
  onConfirmOwnershipDns: () => Promise<unknown>;
  onConfirmDelegatedDcvDns: () => Promise<unknown>;
  onCheckCertificateAgain: () => Promise<unknown>;
  onConfirmCutoverDns: () => Promise<unknown>;
  onRestartCustomHostname: () => Promise<unknown>;
}) {
  const [domainDialogOpen, setDomainDialogOpen] = useState(false);
  const [name, setName] = useState(partner.name);
  const [isSavingName, setIsSavingName] = useState(false);
  const trimmedName = name.trim();
  const isDomainConnected = partner.domain?.setupState === "connected";

  const handleNameSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSavingName(true);
    try {
      await onNameSave(trimmedName);
    } finally {
      setIsSavingName(false);
    }
  };

  return (
    <>
      <PartnerPanel className="max-w-xl">
        <CardHeader>
          <CardTitle>Branding</CardTitle>
          <CardDescription>
            Set the name and logo your customers see, and connect your own
            domain.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-7">
          <form onSubmit={handleNameSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="partner-brand-name">Brand name</FieldLabel>
                <div className="flex gap-2">
                  <Input
                    id="partner-brand-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Your company name"
                    required
                  />
                  <Button
                    type="submit"
                    variant="outline"
                    disabled={
                      isSavingName ||
                      trimmedName === "" ||
                      trimmedName === partner.name
                    }
                  >
                    Save
                  </Button>
                </div>
                <FieldDescription>
                  Shown on your customers&apos; sign-in page and wherever your
                  brand appears in the portal.
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
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
              {isDomainConnected ? (
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <CheckCircle2
                    className="size-4 text-emerald-600"
                    aria-label="Connected"
                  />
                  {partner.domain?.hostname}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Connect a subdomain through the guided DNS setup.
                </p>
              )}
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
