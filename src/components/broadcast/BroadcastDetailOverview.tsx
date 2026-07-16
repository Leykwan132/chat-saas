import type { ReactNode } from 'react';
import { SiWhatsapp } from 'react-icons/si';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

type BroadcastDetailOverviewProps = {
  totalRecipients: number;
  sentCount?: number;
  deliveredPercent?: number;
  costRm: number;
  channelLabel: string;
  templateName: string;
  templateLanguage: string;
  scheduledLabel: string;
  deliverySummary: string;
  status: string;
  errorMessage?: string;
  preview: ReactNode;
};

export function BroadcastDetailOverview({
  totalRecipients,
  sentCount,
  deliveredPercent,
  costRm,
  channelLabel,
  templateName,
  templateLanguage,
  scheduledLabel,
  deliverySummary,
  status,
  errorMessage,
  preview,
}: BroadcastDetailOverviewProps) {
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,400px)]">
      <div className="flex min-w-0 flex-col">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-5 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Sent
            </span>
            <div className="mt-1 text-3xl font-semibold tabular-nums text-foreground">
              {sentCount !== undefined
                ? sentCount.toLocaleString()
                : totalRecipients.toLocaleString()}
            </div>
          </div>
          <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-5 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Delivered
            </span>
            <div className="mt-1 text-3xl font-semibold tabular-nums text-foreground">
              {deliveredPercent !== undefined ? `${deliveredPercent}%` : '—'}
            </div>
          </div>
          <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-5 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Est. cost
            </span>
            <div className="mt-1 text-3xl font-semibold tabular-nums text-foreground">
              RM {costRm.toFixed(2)}
            </div>
          </div>
        </div>

        <Separator className="my-8" />

        <div className="flex w-full flex-col gap-8">
          <div className="flex max-w-xl flex-col gap-2.5">
            <Label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <SiWhatsapp
                className="size-3.5 shrink-0 text-[#25D366]"
                aria-hidden
              />
              WhatsApp account
            </Label>
            <p className="m-0 text-sm font-semibold text-foreground">
              {channelLabel}
            </p>
          </div>

          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:gap-8">
            <div className="flex w-full flex-col gap-4 lg:col-span-5">
              <h3 className="text-base font-bold text-foreground">Message</h3>
              <div className="flex flex-col gap-2.5">
                <Label className="text-xs font-semibold text-foreground">
                  Template
                </Label>
                <p className="m-0 font-mono text-sm font-semibold text-foreground">
                  {templateName}
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                    ({templateLanguage})
                  </span>
                </p>
              </div>
            </div>

            <div className="flex w-full flex-col gap-4 border-t border-border pt-6 lg:col-span-7 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
              <h3 className="text-base font-bold text-foreground">Delivery</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2.5">
                  <Label className="text-xs font-semibold text-foreground">
                    Scheduled time
                  </Label>
                  <p className="m-0 text-sm font-semibold text-foreground">
                    {scheduledLabel}
                  </p>
                </div>
                <div className="flex flex-col gap-2.5">
                  <Label className="text-xs font-semibold text-foreground">
                    Recipients
                  </Label>
                  <p className="m-0 text-sm font-semibold text-foreground">
                    {deliverySummary}
                  </p>
                </div>
                <div className="flex flex-col gap-2.5">
                  <Label className="text-xs font-semibold text-foreground">
                    Status
                  </Label>
                  <p className="m-0 text-sm font-semibold capitalize text-foreground">
                    {status}
                  </p>
                </div>
                {errorMessage ? (
                  <div className="flex flex-col gap-2.5 sm:col-span-2">
                    <Label className="text-xs font-semibold text-destructive">
                      Error
                    </Label>
                    <p className="m-0 text-sm font-semibold text-destructive">
                      {errorMessage}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full lg:justify-self-end lg:border-l lg:border-border lg:pl-8">
        {preview}
      </div>
    </div>
  );
}
