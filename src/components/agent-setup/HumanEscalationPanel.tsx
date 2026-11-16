import { useEffect, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { HumanEscalationRules } from './HumanEscalationRules';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';

export function HumanEscalationPanel({ agentId }: { agentId: Id<'agents'> }) {
  const graph = useQuery(api.workflows.getForAgent, { agentId });
  const ensure = useMutation(api.workflows.ensureForAgent);
  const setEnabled = useMutation(api.humanEscalationSettings.setEnabled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const hasRules = graph?.nodes.some((node) => node.kind === 'humanEscalation') === true;
  const enabled = graph?.workflow.humanEscalationEnabled ?? hasRules;

  useEffect(() => {
    void ensure({ agentId }).catch((cause) => {
      setError(cause instanceof Error ? cause.message : 'Could not load escalation settings');
    });
  }, [agentId, ensure]);

  const save = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(undefined);
    try {
      await action();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not update escalation settings';
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="flex max-w-3xl flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="m-0 text-lg font-semibold tracking-tight text-foreground">Human Escalation</h2>
          <p className="m-0 text-xs leading-5 text-muted-foreground">Hand off to your team when a customer needs human help.</p>
        </div>
        <Switch aria-label="Human Escalation" checked={enabled} disabled={busy || graph === undefined} onCheckedChange={(nextEnabled) => { void save(() => setEnabled({ agentId, enabled: nextEnabled })); }} />
      </div>
      {graph ? (
        <div hidden={!enabled} aria-hidden={!enabled} className="pt-3">
          <HumanEscalationRules agentId={agentId} graph={graph} disabled={busy || !enabled} />
        </div>
      ) : null}
      {graph === undefined ? <Skeleton className="h-5 w-40" /> : null}
      {error ? <p role="alert" className="m-0 text-sm text-destructive">{error}</p> : null}
    </section>
  );
}
