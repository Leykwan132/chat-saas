import { useState, type ReactNode } from 'react';
import { type NodeProps } from '@xyflow/react';
import {
  CalendarClock,
  ChevronRight,
  MessageSquareText,
  Repeat2,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { WorkflowFollowupAudienceField } from './WorkflowFollowupAudienceField';
import { WorkflowFollowupMessageDialog } from './WorkflowFollowupMessageDialog';
import { WorkflowFollowupScheduleFields } from './WorkflowFollowupScheduleFields';
import { WorkflowAutomationScopeField } from './WorkflowAutomationScopeField';
import { useWorkflowAutomationState } from './workflowAutomationContext';
import {
  resolveWorkflowAutomationEnabledChange,
  WORKFLOW_AUTOMATION_MESSAGE_REQUIRED_ERROR,
} from './workflowAutomationActivation';
import { useWorkflowFollowupSummary } from './workflowFollowupSummary';
import type { WorkflowFollowupSetupFlowNode } from './workflowTypes';

type FollowupSetupRowProps = {
  detail: string;
  dialogContent: ReactNode;
  value: string;
  valueClassName?: string;
};

function FollowupSetupRow({
  detail,
  dialogContent,
  value,
  valueClassName,
}: FollowupSetupRowProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="nodrag nopan h-auto min-h-0 w-full flex-1 justify-between rounded border-border bg-background px-3 py-3 text-left hover:bg-muted"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <span className="flex min-w-0 flex-1 items-center gap-3">
            <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
              <span className={cn(
                'max-w-full truncate text-xs font-semibold text-foreground',
                valueClassName,
              )}
              >
                {value}
              </span>
              <span className="max-w-full truncate text-xs font-normal text-muted-foreground">
                {detail}
              </span>
            </span>
          </span>
          <ChevronRight data-icon="inline-end" />
        </Button>
      </DialogTrigger>
      {dialogContent}
    </Dialog>
  );
}

function FollowupSetupSection({
  children,
  Icon,
  title,
}: {
  children: ReactNode;
  Icon: LucideIcon;
  title: string;
}) {
  return (
    <section className="flex min-h-0 flex-col gap-3">
      <h4 className="m-0 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon className="size-4 shrink-0 text-muted-foreground" />
        <span>{title}</span>
      </h4>
      {children}
    </section>
  );
}

export function WorkflowFollowupSetupNode({
  data,
}: NodeProps<WorkflowFollowupSetupFlowNode>) {
  const [showMessageRequiredError, setShowMessageRequiredError] = useState(false);
  const [showScopeRequiredError, setShowScopeRequiredError] = useState(false);
  const automationState = useWorkflowAutomationState();
  const automation = automationState.configs.followUp;
  const summary = useWorkflowFollowupSummary();
  const messageMissing = automation.messageStrategy === 'same'
    ? !automation.sameTemplate
    : automation.attemptTemplates.slice(0, automation.maxAttempts).filter(Boolean).length <
      automation.maxAttempts;
  const handleEnabledChange = (nextEnabled: boolean) => {
    const result = resolveWorkflowAutomationEnabledChange(
      nextEnabled,
      !messageMissing,
      automation.activationScope,
    );
    automationState.setEnabled('followups', result.enabled);
    setShowMessageRequiredError(result.messageRequired);
    setShowScopeRequiredError(result.scopeRequired);
  };

  return (
    <div className="flex h-auto min-h-[760px] w-[440px] cursor-grab flex-col gap-4 rounded-xl border border-border/80 bg-card p-5 text-card-foreground active:cursor-grabbing">
      <div className="flex items-start justify-between gap-4">
        <h3 className="m-0 flex min-w-0 items-center gap-2 text-base font-semibold text-foreground">
          <Repeat2 className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 truncate">{data.title}</span>
        </h3>
        <div className="flex shrink-0 items-center gap-2">
          <span
            aria-hidden="true"
            className={cn(
              'w-14 text-right text-xs font-medium',
              automation.enabled ? 'text-emerald-600' : 'text-muted-foreground',
            )}
          >
            {automation.enabled ? 'Active' : 'Inactive'}
          </span>
          <Switch
            checked={automation.enabled}
            onCheckedChange={handleEnabledChange}
            aria-label={`${data.title} enabled`}
            className="nodrag nopan shrink-0 data-[state=checked]:bg-emerald-600"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      </div>
      <Separator />
      <div className="flex min-h-0 flex-1 flex-col gap-7">
        <FollowupSetupSection title="Apply to" Icon={UsersRound}>
          <WorkflowAutomationScopeField
            labelId="workflow-follow-up-scope-label"
            value={automation.activationScope}
            invalid={showScopeRequiredError}
            onChange={(activationScope) => {
              automationState.setActivationScope('followups', activationScope);
              setShowScopeRequiredError(false);
            }}
            currentAndFutureDescription="Schedule follow-ups still due for eligible existing conversations and after new messages."
            currentAndFutureLabel="Current & future"
            futureOnlyDescription="Schedule follow-ups after new eligible messages while follow-up is on."
            futureOnlyLabel="Future only"
          />
        </FollowupSetupSection>
        <FollowupSetupSection title="Audience" Icon={UsersRound}>
          <WorkflowFollowupAudienceField compact />
        </FollowupSetupSection>
        <FollowupSetupSection title="Schedule" Icon={CalendarClock}>
          <WorkflowFollowupScheduleFields compact />
        </FollowupSetupSection>
        <FollowupSetupSection title="Message" Icon={MessageSquareText}>
          <FollowupSetupRow
            value={summary.messageCardLabel}
            detail={summary.messageCardDetail}
            valueClassName={messageMissing ? 'text-primary' : undefined}
            dialogContent={<WorkflowFollowupMessageDialog />}
          />
          {showMessageRequiredError && messageMissing && (
            <p className="m-0 text-[11px] font-semibold text-destructive">
              {WORKFLOW_AUTOMATION_MESSAGE_REQUIRED_ERROR}
            </p>
          )}
        </FollowupSetupSection>
      </div>
    </div>
  );
}
