import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { isWorkflowTerminalNodeKind } from '../../../shared/workflows';
import { WorkflowAddNodeMenu } from './WorkflowAddNodeMenu';
import { workflowKindIcons } from './workflowCatalog';
import type { WorkflowPersistedFlowNode } from './workflowTypes';

const targetHandleClassName = '!z-0 opacity-0';
const horizontalTargetHandleClassName = '!left-0';
const verticalTargetHandleClassName = '!top-0 !left-1/2 !-translate-x-1/2';
const sourceHandleClassName = '!z-20 !rounded-full !border !border-border !bg-background transition-colors group-hover:!border-muted-foreground/35';
const horizontalSourceHandleClassName = '!right-0 !left-auto';
const verticalSourceHandleClassName = '!bottom-0 !top-auto !left-1/2 !-translate-x-1/2';

export function WorkflowNode({ data, selected }: NodeProps<WorkflowPersistedFlowNode>) {
  const Icon = workflowKindIcons[data.kind];
  const isTerminal = isWorkflowTerminalNodeKind(data.kind);
  const isEntry = data.kind === 'start';
  const isProtected = data.kind === 'start' || data.kind === 'end';
  const isVertical = data.layoutOrientation === 'vertical';
  const isCompact = data.density === 'compact';
  const targetPosition = isVertical ? Position.Top : Position.Left;
  const sourcePosition = isVertical ? Position.Bottom : Position.Right;
  const nodeFrameClassName = isCompact
    ? 'min-w-[150px] max-w-[255px]'
    : 'min-w-[176px] max-w-[300px]';
  const nodeCardClassName = isCompact
    ? 'min-h-[68px] min-w-[150px] max-w-[255px] gap-[5px] rounded-[10px] px-3.5 py-3'
    : 'min-h-20 min-w-[176px] max-w-[300px] gap-1.5 rounded-xl px-4 py-3.5';
  const describedNodeWidthClassName = isCompact ? 'min-w-[187px]' : 'min-w-[220px]';

  return (
    <div className={cn('group relative flex flex-col items-center', nodeFrameClassName)}>
      <Handle
        type="target"
        position={targetPosition}
        className={cn(
          targetHandleClassName,
          isCompact && '!size-2.5',
          isVertical ? verticalTargetHandleClassName : horizontalTargetHandleClassName,
        )}
        isConnectable={!isEntry && !data.disabled}
      />
      <div
        className={cn(
          'relative z-10 flex w-fit flex-col items-start justify-center border border-border bg-card text-left text-card-foreground transition-all group-focus-within:bg-muted group-hover:bg-muted',
          nodeCardClassName,
          selected && 'border-ring ring-1 ring-ring',
          data.description && describedNodeWidthClassName,
        )}
      >
        <div className={cn(
          'flex max-w-full items-center justify-start font-semibold',
          isCompact ? 'gap-2 text-sm' : 'gap-2.5 text-base',
        )}>
          {isEntry ? (
            <span className={cn(
              'flex shrink-0 items-center justify-center bg-muted text-muted-foreground',
              isCompact ? 'size-7 rounded-md' : 'size-8 rounded-lg',
            )}>
              <Icon className={isCompact ? 'size-3.5' : 'size-4'} />
            </span>
          ) : (
            <Icon className={cn('shrink-0', isCompact ? 'size-3.5' : 'size-4')} />
          )}
          <span className="min-w-0 truncate">{data.title}</span>
        </div>
        {data.description ? (
          <p className={cn(
            'line-clamp-2 max-w-full text-left text-muted-foreground',
            isCompact ? 'text-[10px] leading-[1.35]' : 'text-xs leading-relaxed',
          )}>
            {data.description}
          </p>
        ) : null}
      </div>
      {!isTerminal ? (
        <Handle
          type="source"
          position={sourcePosition}
          className={cn(
            sourceHandleClassName,
            isCompact ? '!size-2.5' : '!size-3',
            isVertical ? verticalSourceHandleClassName : horizontalSourceHandleClassName,
          )}
        />
      ) : null}
      {(!isTerminal || !isProtected) ? (
        <div className={cn(
          'nodrag nopan absolute left-full top-1/2 z-20 flex -translate-y-1/2 items-center',
          isCompact ? 'ml-3.5 gap-1.5' : 'ml-4 gap-2',
        )}>
          {!isTerminal ? (
            <WorkflowAddNodeMenu
              compact={isCompact}
              disabled={data.disabled}
              onSelect={(kind) => data.onAddNode(data.nodeId, kind)}
            />
          ) : null}
          {!isProtected ? (
            <Button
              type="button"
              variant="outline"
              size={isCompact ? 'icon-sm' : 'icon'}
              className={cn(
                'cursor-pointer border-destructive bg-destructive text-white hover:bg-destructive/90 hover:text-white',
                isCompact ? 'rounded-lg' : 'rounded-xl',
              )}
              disabled={data.disabled}
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
