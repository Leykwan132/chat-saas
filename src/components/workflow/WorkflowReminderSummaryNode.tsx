import type { ReactNode } from 'react';
import { type NodeProps } from '@xyflow/react';
import { ArrowRight, Info } from 'lucide-react';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { WorkflowAutomationHistoryDialog } from './WorkflowAutomationHistoryDialog';
import { WorkflowReminderMessageDialog } from './WorkflowReminderMessageDialog';
import { useWorkflowAutomationState } from './workflowAutomationContext';
import { useWorkflowReminderSummary } from './workflowReminderSummary';
import type { WorkflowReminderSummaryFlowNode } from './workflowTypes';

function SummaryRow({
  label,
  value,
  valueClassName,
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
      <WorkflowReminderMessageDialog />
    </Dialog>
  );
}

export function WorkflowReminderSummaryNode({
  data,
}: NodeProps<WorkflowReminderSummaryFlowNode>) {
  const { agentId } = useWorkflowAutomationState();
  const summary = useWorkflowReminderSummary();
  const estimate = summary.templateEstimate?.label ?? 'Missing message';
  const estimateMissing = !summary.templateEstimate;

  return (
    <div className="flex w-[380px] cursor-default flex-col gap-4 rounded-xl border border-dashed border-border/80 bg-muted p-5 text-card-foreground">
      <div className="flex items-center justify-between gap-3">
        <h3 className="m-0 min-w-0 truncate text-base font-semibold text-foreground">
          {data.title}
        </h3>
        {agentId && (
          <WorkflowAutomationHistoryDialog
            agentId={agentId}
            automationKind="reminder"
          />
        )}
      </div>
      <p className="m-0 text-[13px] leading-relaxed text-muted-foreground">
        Sends up to{' '}
        <SummaryHighlight>
          {summary.maxAttemptsLabel} {summary.reminderMessageLabel}
        </SummaryHighlight>{' '}
        only to booked appointments at{' '}
        <SummaryHighlight>
          {summary.timingLabel}
        </SummaryHighlight>{' '}
        the appointment.
      </p>
      <div className="flex items-start gap-3 rounded-md border border-dashed border-border/80 bg-background px-3 py-3">
        <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <p className="m-0 text-[13px] leading-relaxed text-muted-foreground">
          Reminders will only be sent to customers with booked appointments.
        </p>
      </div>
      <Separator />
      <div className="flex flex-col gap-2 text-xs">
        <SummaryRow
          label="Message"
          value={<MessageSummaryValue value={summary.messageCardLabel} />}
          valueClassName={summary.messageCardLabel === 'Choose message'
            ? 'text-blue-600 dark:text-sky-400'
            : undefined}
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
