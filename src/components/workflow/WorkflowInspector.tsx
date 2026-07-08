import type { Doc, Id } from '../../../convex/_generated/dataModel';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  WorkflowInspectorForm,
  type WorkflowInspectorSaveValues,
} from './WorkflowInspectorForm';

type WorkflowInspectorProps = {
  agentId?: Id<'agents'>;
  node?: Doc<'workflowNodes'>;
  conditionEdge?: Doc<'workflowEdges'>;
  contentClassName?: string;
  isSaving?: boolean;
  overlayClassName?: string;
  portalContainer?: HTMLElement | null;
  onSave: (values: WorkflowInspectorSaveValues) => void;
  onRemove: () => void;
  onClose: () => void;
};

export function WorkflowInspector({
  agentId,
  node,
  conditionEdge,
  contentClassName,
  isSaving = false,
  overlayClassName,
  portalContainer,
  onSave,
  onRemove,
  onClose,
}: WorkflowInspectorProps) {
  return (
    <Dialog open={Boolean(node)} onOpenChange={(open) => !open && onClose()}>
      {node ? (
        <DialogContent
          className={cn(
            'flex max-h-[min(90vh,760px)] flex-col gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-[920px]',
            contentClassName,
          )}
          overlayClassName={overlayClassName}
          portalContainer={portalContainer}
        >
          <WorkflowInspectorForm
            key={`${node._id}:${conditionEdge?._id ?? 'no-edge'}`}
            agentId={agentId}
            node={node}
            conditionEdge={conditionEdge}
            isSaving={isSaving}
            onSave={onSave}
            onRemove={onRemove}
          />
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
