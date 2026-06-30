import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { isWorkflowTerminalNodeKind } from '../../../shared/workflows';
import { WorkflowAddNodeMenu } from './WorkflowAddNodeMenu';
import { workflowKindIcons } from './workflowCatalog';
import type { WorkflowPersistedFlowNode } from './workflowTypes';

export function WorkflowNode({ data, selected }: NodeProps<WorkflowPersistedFlowNode>) {
  const Icon = workflowKindIcons[data.kind];
  const isTerminal = isWorkflowTerminalNodeKind(data.kind);
  const isEntry = data.kind === 'start';
  const isProtected = data.kind === 'start' || data.kind === 'end';

  return (
    <div className="group relative flex min-w-[176px] max-w-[300px] flex-col items-center">
      <Handle
        type="target"
        position={Position.Top}
        className="left-1/2 !z-0 opacity-0"
        isConnectable={!isEntry}
      />
      <div
        className={cn(
          'relative z-10 flex min-h-20 min-w-[176px] max-w-[300px] w-fit flex-col items-start justify-center gap-1.5 rounded-xl border border-border bg-card px-4 py-3.5 text-left text-card-foreground transition-all group-focus-within:bg-muted group-hover:bg-muted',
          selected && 'border-ring ring-1 ring-ring',
          data.description && 'min-w-[220px]',
        )}
      >
        <div className="flex max-w-full items-center justify-start gap-2.5 text-base font-semibold">
          {isEntry ? (
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Icon className="size-4" />
            </span>
          ) : (
            <Icon className="size-4 shrink-0" />
          )}
          <span className="min-w-0 truncate">{data.title}</span>
        </div>
        {data.description ? (
          <p className="line-clamp-2 max-w-full text-left text-xs leading-relaxed text-muted-foreground">
            {data.description}
          </p>
        ) : null}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="left-1/2 !z-0 opacity-0"
        isConnectable={!isTerminal}
      />
      {(!isTerminal || !isProtected) ? (
        <div className="nodrag nopan absolute left-full top-1/2 z-20 ml-4 flex -translate-y-1/2 items-center gap-2">
          {!isTerminal ? (
            <WorkflowAddNodeMenu
              onSelect={(kind) => data.onAddNode(data.nodeId, kind)}
            />
          ) : null}
          {!isProtected ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="cursor-pointer rounded-xl border-destructive bg-destructive text-white hover:bg-destructive/90 hover:text-white"
              onClick={(event) => {
                event.stopPropagation();
                data.onRemoveNode(data.nodeId);
              }}
            >
              <Trash2 className="size-4" />
              <span className="sr-only">Delete node</span>
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
