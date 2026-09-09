import { BellRing, Clock3, Send } from 'lucide-react';
import type { ReactNode } from 'react';
import type { WorkflowAutomationSource } from '../../../shared/workflowAutomationMessage';
import { Separator } from '@/components/ui/separator';

export function InboxWorkflowAutomationMessage({
  source,
  children,
}: {
  source: WorkflowAutomationSource;
  children: ReactNode;
}) {
  const isReminder = source === 'workflowReminder';
  const isCommentAutomation = source === 'commentAutomation';
  const Icon = isReminder ? BellRing : isCommentAutomation ? Send : Clock3;
  const label = isReminder
    ? 'Reminder'
    : isCommentAutomation
      ? 'Automation message sent'
      : 'Follow-up';
  return (
    <div className="ml-auto w-fit min-w-48 max-w-full overflow-hidden rounded-md border border-primary/20 bg-primary/5 text-foreground">
      <div className="flex flex-col gap-1.5 p-2 text-sm leading-snug">
        {children}
      </div>
      <Separator />
      <div className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium text-muted-foreground">
        <Icon className="size-3" />
        <span>{label}</span>
      </div>
    </div>
  );
}
