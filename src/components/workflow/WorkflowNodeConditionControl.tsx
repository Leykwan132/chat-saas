import { useEffect, useState } from 'react';
import { useMutation } from 'convex/react';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { Textarea } from '@/components/ui/textarea';

type WorkflowNodeConditionControlProps = {
  agentId: Id<'agents'>;
  nodeId: Id<'workflowNodes'>;
  conditionDetail?: string;
  disabled: boolean;
};

export function WorkflowNodeConditionControl({
  agentId,
  nodeId,
  conditionDetail,
  disabled,
}: WorkflowNodeConditionControlProps) {
  const updateIncomingCondition = useMutation(
    api.workflowNodeCanvasControls.updateIncomingCondition,
  );
  const subscribedConditionDetail = conditionDetail ?? '';
  const [value, setValue] = useState(subscribedConditionDetail);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setValue(subscribedConditionDetail);
  }, [subscribedConditionDetail]);

  useEffect(() => {
    if (value === subscribedConditionDetail) return;

    const timeout = window.setTimeout(() => {
      setIsSaving(true);
      void updateIncomingCondition({ agentId, nodeId, conditionDetail: value })
        .catch((error) => {
          setValue(subscribedConditionDetail);
          toast.error(error instanceof Error ? error.message : 'Could not update the condition');
        })
        .finally(() => setIsSaving(false));
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [agentId, nodeId, subscribedConditionDetail, updateIncomingCondition, value]);

  return (
    <div
      className="nodrag nopan mt-3 w-full border-t border-border pt-3"
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground" htmlFor={`workflow-node-condition-${nodeId}`}>
        When
      </label>
      <Textarea
        id={`workflow-node-condition-${nodeId}`}
        value={value}
        disabled={disabled || isSaving}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Describe when to hand off"
        className="min-h-16 resize-none text-xs leading-relaxed"
      />
    </div>
  );
}
