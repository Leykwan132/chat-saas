import { useState } from "react";
import { Check, Copy, ExternalLink, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  DnsRecordInstruction,
  getSetupStepStatus,
  OwnershipVerifiedDetail,
  SetupStep,
  StepDetail,
  VerificationCheckingDetail,
} from "@/components/partner/PartnerCustomDomainStep";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import type { PartnerProfile } from "@/lib/whiteLabelApi";

type Domain = NonNullable<PartnerProfile["domain"]>;

function copyText(value: string, message: string) {
  void navigator.clipboard.writeText(value);
  toast.success(message);
}

export function PartnerCustomDomainDialog({
  open,
  onOpenChange,
  domain,
  onCreate,
  onConfirmOwnership,
  onConfirmDcv,
  onCheckCertificateAgain,
  onConfirmCutover,
  onRestart,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domain: Domain | null;
  onCreate: (hostname: string) => Promise<unknown>;
  onConfirmOwnership: () => Promise<unknown>;
  onConfirmDcv: () => Promise<unknown>;
  onCheckCertificateAgain: () => Promise<unknown>;
  onConfirmCutover: () => Promise<unknown>;
  onRestart: () => Promise<unknown>;
}) {
  const [hostname, setHostname] = useState("");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [restartConfirmation, setRestartConfirmation] = useState(false);
  const state = domain?.setupState ?? null;
  const domainStepStatus = domain === null ? "active" : "complete";
  const ownershipStatus = getSetupStepStatus(
    state,
    ["ownership_pending", "ownership_checking"],
    ["dcv_pending", "certificate_checking", "cutover_pending", "connection_checking", "connected"],
  );
  const dcvStatus = getSetupStepStatus(
    state,
    ["dcv_pending", "certificate_checking"],
    ["cutover_pending", "connection_checking", "connected"],
  );
  const certificateStatus = getSetupStepStatus(
    state,
    ["certificate_checking"],
    ["cutover_pending", "connection_checking", "connected"],
  );
  const cutoverStatus = getSetupStepStatus(
    state,
    ["cutover_pending", "connection_checking"],
    ["connected"],
  );
  const isConnected = domain?.setupState === "connected";
  const run = async (action: string, work: () => Promise<unknown>) => {
    setPendingAction(action);
    try {
      await work();
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl rounded-lg shadow-none ring-0">
        <DialogHeader>
          <DialogTitle>Set up custom domain</DialogTitle>
          <DialogDescription>
            Complete each step in order. We only check DNS after you confirm
            that the record has been added.
          </DialogDescription>
          {domain ? (
            <div className="flex flex-wrap items-center gap-2">
              <p className="rounded-md bg-muted px-3 py-1.5 text-sm font-medium">
                {domain.hostname}
              </p>
              <Button
                size="sm"
                variant="outline"
                disabled={pendingAction !== null}
                onClick={() => setRestartConfirmation(true)}
              >
                <RotateCcw data-icon="inline-start" />
                Start over
              </Button>
            </div>
          ) : null}
        </DialogHeader>
        <div className="flex flex-col gap-5">
          {domain?.validationError ? (
            <Alert variant="destructive">
              <AlertDescription>{domain.validationError}</AlertDescription>
            </Alert>
          ) : null}
          <SetupStep status={domainStepStatus} number={1} title="Choose domain">
            {domain === null ? (
              <FieldGroup className="gap-2">
                <Field orientation="horizontal">
                  <Input
                    id="custom-hostname"
                    value={hostname}
                    onChange={(event) => setHostname(event.target.value)}
                    placeholder="app.partner.com"
                  />
                  <Button
                    onClick={() => void run("create", () => onCreate(hostname))}
                    disabled={!hostname.trim() || pendingAction !== null}
                  >
                    {pendingAction === "create" ? <Spinner data-icon="inline-start" /> : null}
                    Confirm
                  </Button>
                </Field>
                <FieldDescription>
                  Use a subdomain you control. Root domains are not supported.
                </FieldDescription>
              </FieldGroup>
            ) : (
              <StepDetail>Hostname created: {domain.hostname}</StepDetail>
            )}
          </SetupStep>
          <SetupStep
            status={ownershipStatus}
            number={2}
            title="Verify domain ownership"
          >
            <DnsRecordInstruction record={domain?.ownershipRecord ?? null} />
            {state === "ownership_pending" ? (
              <Button
                disabled={pendingAction !== null}
                onClick={() => void run("ownership", onConfirmOwnership)}
              >
                {pendingAction === "ownership" ? <Spinner data-icon="inline-start" /> : <Check data-icon="inline-start" />}
                Done
              </Button>
            ) : state === "ownership_checking" ? (
              <VerificationCheckingDetail message="Checking ownership DNS." />
            ) : ownershipStatus === "complete" ? (
              <OwnershipVerifiedDetail />
            ) : null}
          </SetupStep>
          <SetupStep
            status={dcvStatus}
            number={3}
            title="Delegate certificate validation"
          >
            <DnsRecordInstruction
              record={domain?.delegatedDcvRecord ?? null}
            />
            {state === "dcv_pending" ? (
              <Button
                disabled={pendingAction !== null}
                onClick={() => void run("dcv", onConfirmDcv)}
              >
                {pendingAction === "dcv" ? <Spinner data-icon="inline-start" /> : <Check data-icon="inline-start" />}
                Done
              </Button>
            ) : state === "certificate_checking" ? (
              <div className="flex flex-wrap items-center gap-3">
                <VerificationCheckingDetail message="Waiting for certificate…" brief />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pendingAction !== null}
                  onClick={() =>
                    void run("certificate", onCheckCertificateAgain)
                  }
                >
                  {pendingAction === "certificate" ? <Spinner data-icon="inline-start" /> : null}
                  Check again
                </Button>
              </div>
            ) : dcvStatus === "complete" ? (
              <StepDetail>Certificate validation is ready.</StepDetail>
            ) : null}
          </SetupStep>
          <SetupStep
            status={certificateStatus}
            number={4}
            title="Wait for TLS readiness"
          >
            {state === "certificate_checking" ? (
              <VerificationCheckingDetail message="Cloudflare is checking certificate readiness." />
            ) : (
              <StepDetail>
                {domain?.certificateStatus === "active"
                  ? "TLS certificate is active."
                  : "Complete the delegated validation step first."}
              </StepDetail>
            )}
          </SetupStep>
          <SetupStep status={cutoverStatus} number={5} title="Cut over traffic">
            <DnsRecordInstruction record={domain?.cutoverRecord ?? null} />
            {state === "cutover_pending" ? (
              <Button
                disabled={pendingAction !== null}
                onClick={() => void run("cutover", onConfirmCutover)}
              >
                {pendingAction === "cutover" ? <Spinner data-icon="inline-start" /> : <Check data-icon="inline-start" />}
                Done
              </Button>
            ) : state === "connection_checking" ? (
              <VerificationCheckingDetail message="Checking your CNAME connection." />
            ) : cutoverStatus === "complete" ? (
              <StepDetail>Traffic is connected.</StepDetail>
            ) : null}
          </SetupStep>
          <SetupStep status={isConnected ? "complete" : "locked"} number={6} title="Connected domain">
            {isConnected && domain?.previewUrl ? (
              <div className="flex flex-col gap-3">
                <StepDetail>{domain.hostname} is connected and ready to use.</StepDetail>
                <div className="flex flex-wrap items-center gap-2">
                  <Button asChild variant="outline">
                    <a href={domain.previewUrl} target="_blank" rel="noreferrer">
                      <ExternalLink data-icon="inline-start" />
                      Preview domain
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() =>
                      copyText(domain.previewUrl, "Preview link copied.")
                    }
                  >
                    <Copy data-icon="inline-start" />
                    Copy preview link
                  </Button>
                </div>
              </div>
            ) : (
              <StepDetail>
                Available after Cloudflare and your final CNAME are verified.
              </StepDetail>
            )}
          </SetupStep>
          {domain ? (
            <div className="flex flex-col gap-2">
              {restartConfirmation ? (
                <>
                  <StepDetail>
                    This permanently removes {domain.hostname} and its Cloudflare
                    certificate. Your DNS records are not changed.
                  </StepDetail>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="destructive"
                      disabled={pendingAction !== null}
                      onClick={() => void run("restart", onRestart)}
                    >
                      {pendingAction === "restart" ? <Spinner data-icon="inline-start" /> : null}
                      Confirm start over
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={pendingAction !== null}
                      onClick={() => setRestartConfirmation(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
