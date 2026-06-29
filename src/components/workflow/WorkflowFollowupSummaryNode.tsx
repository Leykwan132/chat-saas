import type { ReactNode } from 'react';
import { type NodeProps } from '@xyflow/react';
import { ArrowRight } from 'lucide-react';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { WorkflowFollowupMessageDialog } from './WorkflowFollowupMessageDialog';
import { useWorkflowFollowupSummary } from './workflowFollowupSummary';
import type { WorkflowFollowupSummaryFlowNode } from './workflowTypes';

function SummaryRow({
  label,
  valueClassName,
  value,
}: {
  label: string;
  value: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-dashed border-border/60 pb-1.5 last:border-b-0 last:pb-0">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className={cn(
        'min-w-0 truncate text-right font-semibold text-foreground',
        valueClassName,
      )}
      >
        {value}
      </span>
    </div>
  );
}

function SummaryHighlight({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md border border-border/70 bg-background/80 px-1.5 py-0.5 text-[13px] font-semibold leading-none text-foreground">
      {children}
    </span>
  );
}

function MessageSummaryValue({ value }: { value: string }) {
  if (value !== 'Choose message') return value;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="nodrag nopan inline-flex max-w-full cursor-pointer items-center justify-end gap-1 truncate text-right text-blue-600 underline-offset-2 hover:text-blue-700 hover:underline dark:text-sky-400 dark:hover:text-sky-300"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <span className="truncate">{value}</span>
          <ArrowRight className="size-3 shrink-0" />
        </button>
      </DialogTrigger>
      <WorkflowFollowupMessageDialog initialStage="configure" />
    </Dialog>
  );
}

export function WorkflowFollowupSummaryNode({
  data,
}: NodeProps<WorkflowFollowupSummaryFlowNode>) {
  const summary = useWorkflowFollowupSummary();
  const estimate = summary.templateEstimate?.label ?? 'Missing message';
  const estimateMissing = !summary.templateEstimate;

  return (
    <div className="flex w-[380px] cursor-default flex-col gap-4 rounded-xl border border-dashed border-border/80 bg-muted p-5 text-card-foreground">
      <h3 className="m-0 truncate text-base font-semibold text-foreground">
        {data.title}
      </h3>
      <p className="m-0 text-[13px] leading-relaxed text-muted-foreground">
        Sends up to{' '}
        <SummaryHighlight>
          {summary.maxAttemptsLabel} {summary.followupMessageLabel}
        </SummaryHighlight>{' '}
        to {summary.audience.label.toLowerCase()}, starting{' '}
        <SummaryHighlight>
          {summary.startAfter.summaryLabel ?? summary.startAfter.label}
        </SummaryHighlight>{' '}
        after no reply and will reattempt every{' '}
        <SummaryHighlight>
          {summary.interval.summaryLabel ?? summary.interval.label}
        </SummaryHighlight>.
      </p>
      <Separator />
      <div className="flex flex-col gap-2 text-xs">
        <SummaryRow label="Audience" value={summary.audience.label} />
        <SummaryRow label="Starts" value={summary.startAfter.label} />
        <SummaryRow label="Repeats" value={summary.interval.label} />
        <SummaryRow label="Limit" value={summary.maxAttempts.label} />
        <SummaryRow
          label="Message"
          value={<MessageSummaryValue value={summary.messageCardLabel} />}
          valueClassName={summary.messageCardLabel === 'Choose message'
            ? 'text-blue-600 dark:text-sky-400'
            : undefined}
        />
        <SummaryRow
          label="Strategy"
          value={summary.followupMessageStrategy === 'same'
            ? 'Same message'
            : `${summary.configuredAttemptCount}/${summary.maxAttemptsLabel} selected`}
        />
        <SummaryRow
          label="Est. cost"
          value={estimate}
          valueClassName={estimateMissing ? 'text-destructive' : undefined}
        />
      </div>
    </div>
  );
}
