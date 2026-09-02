import type { ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import type { DnsRecord } from "@/lib/whiteLabelApi";

export type SetupStepStatus = "locked" | "active" | "complete";

export function getSetupStepStatus<State extends string>(
  state: State | null,
  activeStates: State[],
  completedStates: State[],
): SetupStepStatus {
  if (state !== null && completedStates.includes(state)) return "complete";
  if (state !== null && activeStates.includes(state)) return "active";
  return "locked";
}

export function SetupStep({
  children,
  number,
  status,
  title,
}: {
  children: ReactNode;
  number: number;
  status: SetupStepStatus;
  title: string;
}) {
  if (status === "complete") {
    return (
      <Accordion type="single" collapsible className="w-full overflow-visible rounded-none border-0">
        <AccordionItem value={`step-${number}`} className="border-0">
          <AccordionTrigger className="p-0 hover:no-underline">
            <SetupStepTitle number={number} status={status} title={title} />
          </AccordionTrigger>
          <AccordionContent className="-mx-4 px-0 pt-3 pb-0">
            <div className="flex flex-col gap-3">{children}</div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    );
  }

  return (
    <section
      className={cn("flex flex-col gap-3", status === "locked" && "opacity-40")}
    >
      <SetupStepTitle number={number} status={status} title={title} />
      {status === "locked" ? (
        <StepDetail>Complete the previous step first.</StepDetail>
      ) : (
        children
      )}
    </section>
  );
}

function SetupStepTitle({
  number,
  status,
  title,
}: {
  number: number;
  status: SetupStepStatus;
  title: string;
}) {
  return (
    <span className="flex items-center gap-2 font-medium">
      {status === "complete" ? (
        <span className="flex size-5 items-center justify-center rounded-full bg-emerald-600 text-white">
          <Check className="size-3" />
        </span>
      ) : null}
      Step {number}: {title}
    </span>
  );
}

export function DnsRecordInstruction({ record }: { record: DnsRecord | null }) {
  if (record === null) return null;
  return (
    <div className="space-y-3 text-sm">
      <StepDetail>
        Add this record in your DNS provider for this domain, then select Done.
      </StepDetail>
      <div className="grid gap-3 sm:grid-cols-[max-content_minmax(0,1fr)_minmax(0,1fr)]">
        <DnsRecordField label="Type" value={record.type} />
        <DnsRecordField label="Name" value={record.name} />
        <DnsRecordField label="Value" value={record.value} />
      </div>
    </div>
  );
}

function DnsRecordField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex min-w-0 items-center gap-2">
        <p className="min-w-0 flex-1 break-all rounded-md bg-muted px-3 py-2 font-medium">
          {value}
        </p>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={() => {
            void navigator.clipboard.writeText(value);
            toast.success(`DNS ${label} copied.`);
          }}
        >
          <Copy />
          <span className="sr-only">Copy DNS {label}</span>
        </Button>
      </div>
    </div>
  );
}

export function StepDetail({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

export function OwnershipVerifiedDetail() {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Check className="size-4" data-icon="inline-start" />
      <span>Ownership verified.</span>
    </div>
  );
}

export function VerificationCheckingDetail({
  brief = false,
  message,
}: {
  brief?: boolean;
  message: string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Spinner data-icon="inline-start" />
      {brief ? <span>{message}</span> : (
        <div className="flex flex-col gap-0.5">
          <span>{message}</span>
          <span className="text-xs">
            Usually takes a few minutes. DNS propagation can take longer.
          </span>
        </div>
      )}
    </div>
  );
}
