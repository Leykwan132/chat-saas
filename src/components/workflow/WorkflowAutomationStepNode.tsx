import { useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { WorkflowFollowupAudienceDialog } from './WorkflowFollowupAudienceDialog';
import { WorkflowFollowupMessageDialog } from './WorkflowFollowupMessageDialog';
import { WorkflowFollowupScheduleDialog } from './WorkflowFollowupScheduleDialog';
import { useWorkflowAutomationSelection } from './workflowAutomationState';
import { useWorkflowFollowupSummary } from './workflowFollowupSummary';
import type { WorkflowAutomationStepFlowNode } from './workflowTypes';
import {
  getWorkflowAutomationEstimateLabel,
  getWorkflowAutomationOption,
  getWorkflowAutomationStep,
} from './workflowTriggerOptions';

export function WorkflowAutomationStepNode({
  data,
}: NodeProps<WorkflowAutomationStepFlowNode>) {
  const step = getWorkflowAutomationStep(data.kind, data.stepKey);
  if (!step) {
    throw new Error(`Unknown workflow automation step: ${data.kind}.${data.stepKey}`);
  }

  const [dialogOpen, setDialogOpen] = useState(false);
  const { selectedOptionId, setSelectedOptionId } = useWorkflowAutomationSelection(
    data.kind,
    data.stepKey,
    data.defaultOptionId,
  );
  const selectedOption = getWorkflowAutomationOption(step, selectedOptionId);
  if (!selectedOption) {
    throw new Error(`Unknown workflow automation option: ${data.kind}.${data.stepKey}.${selectedOptionId}`);
  }

  const Icon = selectedOption.Icon;
  const estimate = data.stepKey === 'template'
    ? getWorkflowAutomationEstimateLabel(selectedOption)
    : undefined;
  const followupSummary = useWorkflowFollowupSummary();
  const showFollowupAudienceDialog = (
    data.kind === 'followups' &&
    data.stepKey === 'audience'
  );
  const showFollowupScheduleDialog = (
    data.kind === 'followups' &&
    data.stepKey === 'schedule'
  );
  const showFollowupMessageDialog = (
    data.kind === 'followups' &&
    data.stepKey === 'template'
  );
  const optionLabel = showFollowupScheduleDialog
    ? followupSummary.scheduleCardLabel
    : showFollowupAudienceDialog
      ? followupSummary.audienceCardLabel
    : showFollowupMessageDialog
      ? followupSummary.messageCardLabel
    : selectedOption.label;
  const detail = showFollowupScheduleDialog
    ? followupSummary.scheduleCardDetail
    : showFollowupAudienceDialog
      ? followupSummary.audienceCardDetail
    : showFollowupMessageDialog
      ? followupSummary.messageCardDetail
    : estimate ? `Estimated cost: ${estimate.label}` : selectedOption.description;

  return (
    <div className="group relative flex min-w-[300px] max-w-[300px] flex-col items-center">
      <Handle
        type="target"
        position={Position.Top}
        className="left-1/2 !z-0 opacity-0"
        isConnectable={false}
      />
      <div className="relative z-10 flex h-32 w-[300px] flex-col gap-3 rounded-xl border border-border bg-card px-5 py-4 text-left text-card-foreground transition-all group-focus-within:bg-muted group-hover:bg-muted">
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Icon className="size-4" />
          </span>
          <span className="block min-w-0 truncate text-sm font-semibold text-foreground">
            {step.label}
          </span>
        </span>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="nodrag nopan h-auto min-h-12 w-full justify-between rounded-lg border-border bg-input/50 px-3 py-2.5"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
            >
              <span className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left">
                <span className="truncate text-[13px] font-semibold leading-tight text-foreground">
                  {optionLabel}
                </span>
                <span className="min-w-0 flex-1 truncate text-right text-[11px] font-normal leading-tight text-muted-foreground">
                  {detail}
                </span>
              </span>
              <ChevronRight data-icon="inline-end" />
            </Button>
          </DialogTrigger>
          {showFollowupAudienceDialog ? (
            <WorkflowFollowupAudienceDialog />
          ) : showFollowupScheduleDialog ? (
            <WorkflowFollowupScheduleDialog />
          ) : showFollowupMessageDialog ? (
            <WorkflowFollowupMessageDialog />
          ) : (
            <DialogContent
              className="max-h-[calc(100vh-2rem)] gap-0 overflow-hidden p-0 sm:max-w-md"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
            >
              <DialogHeader className="border-b border-border px-6 py-6 pr-14">
                <DialogTitle>{step.label}</DialogTitle>
                <DialogDescription>{step.menuLabel}</DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[calc(100vh-10rem)]">
                <div className="flex flex-col gap-4 px-6 py-6">
                  {step.options.map((option) => {
                    const OptionIcon = option.Icon;
                    const optionEstimate = data.stepKey === 'template'
                      ? getWorkflowAutomationEstimateLabel(option)
                      : undefined;
                    const optionDetail = optionEstimate
                      ? `Estimated cost: ${optionEstimate.label}`
                      : option.description;

                    return (
                      <button
                        key={option.id}
                        type="button"
                        aria-pressed={option.id === selectedOptionId}
                        onClick={() => {
                          setSelectedOptionId(option.id);
                          setDialogOpen(false);
                        }}
                        className={cn(
                          'flex cursor-pointer flex-col gap-3 rounded-xl border border-border bg-card p-5 text-left transition-colors hover:bg-muted',
                          option.id === selectedOptionId && 'border-primary/40 bg-muted',
                        )}
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                            <OptionIcon className="size-4" />
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm font-semibold leading-tight text-foreground">
                            {option.label}
                          </span>
                        </span>
                        <span className="text-sm leading-relaxed text-muted-foreground">
                          {optionDetail}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </DialogContent>
          )}
        </Dialog>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="left-1/2 !z-0 !size-3 !border-2 !border-background !bg-muted-foreground opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
        isConnectable={false}
      />
    </div>
  );
}
