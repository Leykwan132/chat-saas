import { useState, type FormEvent } from "react";
import { CheckCircle2, Globe2, ImagePlus } from "lucide-react";
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
import { Spinner } from "@/components/ui/spinner";
import { type PartnerProfile } from "@/lib/whiteLabelApi";

export function PartnerBrandingTab({
  partner,
  onNameSave,
  onLogoUpload,
  onCreateCustomHostname,
  onConfirmOwnershipDns,
  onConfirmDelegatedDcvDns,
  onCheckCertificateAgain,
  onConfirmCutoverDns,
  onRestartCustomHostname,
}: {
  partner: PartnerProfile;
  onNameSave: (name: string) => Promise<unknown>;
  onLogoUpload: (file: File) => Promise<unknown>;
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
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const trimmedName = name.trim();
  const isDomainConnected = partner.domain?.setupState === "connected";
  const signInPreviewUrl = partner.domain?.previewUrl
    ? `${partner.domain.previewUrl}/sign-in`
    : null;

  const handleNameSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSavingName(true);
    try {
      await onNameSave(trimmedName);
    } finally {
      setIsSavingName(false);
    }
  };

  const handleLogoSelect = async (file: File | undefined) => {
    if (!file) return;
    setIsUploadingLogo(true);
    try {
      await onLogoUpload(file);
    } finally {
      setIsUploadingLogo(false);
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
              <label
                htmlFor="partner-logo"
                data-disabled={isUploadingLogo}
                className="group relative flex h-20 w-40 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/40 transition-colors hover:border-foreground/50 data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-60"
              >
                <input
                  id="partner-logo"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={isUploadingLogo}
                  onChange={(event) => {
                    void handleLogoSelect(event.currentTarget.files?.[0]);
                    event.currentTarget.value = "";
                  }}
                />
                {partner.logoUrl ? (
                  <img
                    src={partner.logoUrl}
                    alt={`${partner.name} logo`}
                    className="size-full object-contain p-3"
                  />
                ) : (
                  <span className="flex flex-col items-center gap-1 text-muted-foreground">
                    <ImagePlus className="size-6" />
                    <span className="text-xs font-medium">Upload logo</span>
                  </span>
                )}
                {partner.logoUrl && !isUploadingLogo ? (
                  <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                    <ImagePlus className="size-5" />
                    <span className="text-xs font-medium">Replace logo</span>
                  </span>
                ) : null}
                {isUploadingLogo ? (
                  <span className="absolute inset-0 flex items-center justify-center bg-background/65">
                    <Spinner className="size-5" />
                  </span>
                ) : null}
              </label>
              <FieldDescription>
                Shown above the heading on your customers&apos; sign-in page.
              </FieldDescription>
              {signInPreviewUrl ? (
                <FieldDescription>
                  Preview:{" "}
                  <a
                    href={signInPreviewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    {signInPreviewUrl}
                  </a>
                </FieldDescription>
              ) : null}
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
