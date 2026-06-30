import { useEffect, useRef, useState } from 'react';
import { Bell, MessageSquarePlus, PenLine } from 'lucide-react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import type { WorkflowAutomationFlowNode } from './workflowTypes';

const automationNodeStyles = {
  reminders: {
    Icon: Bell,
  },
  followups: {
    Icon: MessageSquarePlus,
  },
} satisfies Record<
  WorkflowAutomationFlowNode['data']['kind'],
  { Icon: typeof Bell }
>;

export function WorkflowAutomationNode({
  data,
}: NodeProps<WorkflowAutomationFlowNode>) {
  const [enabled, setEnabled] = useState(false);
  const [title, setTitle] = useState(data.title);
  const [isRenaming, setIsRenaming] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const { Icon } = automationNodeStyles[data.kind];

  useEffect(() => {
    if (!isRenaming) return;
    titleInputRef.current?.focus();
    titleInputRef.current?.select();
  }, [isRenaming]);

  return (
    <div className="group relative flex min-w-[300px] max-w-[300px] flex-col items-center">
      <Handle
        type="target"
        position={Position.Top}
        className="left-1/2 !z-0 opacity-0"
        isConnectable={false}
      />
      <div className="relative z-10 flex min-h-20 w-full flex-col items-start justify-center gap-3 rounded-xl border border-border bg-card px-5 py-4 text-left text-card-foreground transition-all group-focus-within:bg-muted group-hover:bg-muted">
        <div className="flex w-full max-w-full items-center justify-between gap-4 text-base font-semibold">
          <div className="flex min-w-0 items-center justify-start gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Icon className="size-4" />
            </span>
            {isRenaming ? (
              <Input
                ref={titleInputRef}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                onBlur={() => setIsRenaming(false)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === 'Escape') {
                    event.currentTarget.blur();
                  }
                }}
                className="nodrag nopan h-8 min-w-0 border-border bg-background px-2 text-base font-semibold"
                aria-label={`Rename ${data.title}`}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
              />
            ) : (
              <button
                type="button"
                className="nodrag nopan flex min-w-0 items-center gap-1.5 rounded-md text-left outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  setIsRenaming(true);
                }}
              >
                <span className="min-w-0 truncate">{title}</span>
                <PenLine className="size-3 shrink-0 text-muted-foreground" />
              </button>
            )}
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={setEnabled}
            aria-label={`${title} enabled`}
            className="nodrag nopan shrink-0 data-[state=checked]:bg-emerald-600"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="left-1/2 !z-0 opacity-0"
        isConnectable={false}
      />
    </div>
  );
}
