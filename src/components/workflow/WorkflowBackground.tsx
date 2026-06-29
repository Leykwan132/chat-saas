import { Background, BackgroundVariant, type NodeProps } from '@xyflow/react';
import { cn } from '@/lib/utils';
import type { WorkflowTriggerBackdropFlowNode } from './workflowTypes';

const triggerBackdropStyles = {
  reminders: 'border-amber-500/20 bg-amber-500/10 dark:border-amber-300/15 dark:bg-amber-400/10',
  followups: 'border-sky-500/20 bg-sky-500/10 dark:border-sky-300/15 dark:bg-sky-400/10',
} satisfies Record<WorkflowTriggerBackdropFlowNode['data']['kind'], string>;

export function WorkflowBackground() {
  return (
    <Background
      variant={BackgroundVariant.Dots}
      gap={20}
      size={1}
      color="hsl(var(--muted-foreground) / 0.22)"
      bgColor="hsl(var(--muted) / 0.35)"
    />
  );
}

export function WorkflowTriggerBackdropNode({
  data,
}: NodeProps<WorkflowTriggerBackdropFlowNode>) {
  return (
    <div
      className={cn(
        'relative h-full w-full cursor-grab rounded-[28px] border active:cursor-grabbing',
        triggerBackdropStyles[data.kind],
      )}
      style={{ width: data.width, height: data.height }}
    />
  );
}
