import { Check } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import {
  getAgentTrainingLabel,
  type AgentIndexingStatus,
} from '@/lib/agentIndexingStatus';

type KnowledgeBaseTrainingStatusProps = {
  indexingStatus: AgentIndexingStatus | null;
  isCheckingStatus: boolean;
};

export function KnowledgeBaseTrainingStatus({ indexingStatus }: KnowledgeBaseTrainingStatusProps) {
  if (!indexingStatus) return null;

  const status = indexingStatus.isIndexing ? 'indexing' : 'ready';
  const label = status === 'indexing'
    ? getAgentTrainingLabel(indexingStatus)
    : 'Your agent is ready.';
  return (
    <div role="status" className="inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm font-medium text-foreground">
      <span className={status === 'ready' ? 'flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-600' : 'flex size-5 shrink-0 items-center justify-center rounded-full bg-yellow-400'}>
        {status === 'ready' ? <Check className="size-3.5 text-white" /> : <Spinner className="size-3 text-yellow-950" />}
      </span>
      <span>{label}</span>
    </div>
  );
}
