import { ListFilter } from "lucide-react";
import { useEffect, useState } from 'react';
import { useMutation } from 'convex/react';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';
import type { Doc, Id } from '../../../convex/_generated/dataModel';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';

export function HumanEscalationCondition({ agentId, edge, disabled }: {
  agentId: Id<'agents'>;
  edge: Doc<'workflowEdges'>;
  disabled: boolean;
}) {
  const update = useMutation(api.workflows.updateEdgeCondition);
  const subscribed = edge.detail ?? '';
  const [value, setValue] = useState(subscribed);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (value === subscribed) return;
    const timeout = window.setTimeout(() => {
      setSaving(true);
      void update({ agentId, edgeId: edge._id, label: edge.label ?? '', detail: value })
        .catch((cause) => {
          setValue(subscribed);
          toast.error(cause instanceof Error ? cause.message : 'Could not save escalation condition');
        })
        .finally(() => setSaving(false));
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [agentId, edge._id, edge.label, subscribed, update, value]);

  return (
    <Field>
      <div className="flex flex-col gap-0.5">
        <FieldLabel htmlFor={`escalation-condition-${edge._id}`}><ListFilter aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />Condition</FieldLabel>
        <FieldDescription className="m-0 text-xs leading-5">Describe when your agent should hand the conversation to a human.</FieldDescription>
      </div>
      <Textarea id={`escalation-condition-${edge._id}`} value={value} disabled={disabled || saving} onChange={(event) => setValue(event.target.value)} placeholder="Describe when to hand off to your team" className="min-h-20" />
    </Field>
  );
}
