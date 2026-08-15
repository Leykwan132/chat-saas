import { useEffect, useState } from 'react';
import { useMutation } from 'convex/react';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { Textarea } from '@/components/ui/textarea';

type WorkflowNodeMessageControlProps = {
  agentId: Id<'agents'>;
  nodeId: Id<'workflowNodes'>;
  description?: string;
  disabled: boolean;
};

export function WorkflowNodeMessageControl({
  agentId,
  nodeId,
  description,
  disabled,
}: WorkflowNodeMessageControlProps) {
  const updateMessage = useMutation(api.workflowNodeCanvasControls.updateMessage);
  const subscribedDescription = description ?? '';
  const [value, setValue] = useState(subscribedDescription);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setValue(subscribedDescription);
  }, [subscribedDescription]);

  useEffect(() => {
    if (value === subscribedDescription) return;

    const timeout = window.setTimeout(() => {
      setIsSaving(true);
      void updateMessage({ agentId, nodeId, description: value })
        .catch((error) => {
          setValue(subscribedDescription);
          toast.error(error instanceof Error ? error.message : 'Could not update the message');
        })
        .finally(() => setIsSaving(false));
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [agentId, nodeId, subscribedDescription, updateMessage, value]);

  return (
    <div
      className="nodrag nopan mt-3 w-full border-t border-border pt-3"
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <Textarea
        aria-label="Message to send"
        value={value}
        disabled={disabled || isSaving}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Write the message to send"
        className="min-h-20 resize-none text-xs leading-relaxed"
      />
    </div>
  );
}
