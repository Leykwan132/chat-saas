import { Check } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import {
  getAgentTrainingLabel,
  getAgentTrainingStatus,
  type AgentIndexingStatus,
} from '@/lib/agentIndexingStatus';

type KnowledgeBaseTrainingStatusProps = {
  indexingStatus: AgentIndexingStatus | null;
  isCheckingStatus: boolean;
};

export function KnowledgeBaseTrainingStatus({ indexingStatus, isCheckingStatus }: KnowledgeBaseTrainingStatusProps) {
  const status = getAgentTrainingStatus(isCheckingStatus, indexingStatus);
  const label = status === 'loading'
    ? 'Checking status…'
    : status === 'indexing'
      ? getAgentTrainingLabel(indexingStatus!)
      : 'Your agent is ready.';
  return (
    <div role="status" className="inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm font-medium text-foreground">
      <span className={status === 'ready' ? 'flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-600' : status === 'indexing' ? 'flex size-5 shrink-0 items-center justify-center rounded-full bg-yellow-400' : 'flex size-5 shrink-0 items-center justify-center rounded-full bg-muted-foreground/20'}>
        {status === 'ready' ? <Check className="size-3.5 text-white" /> : <Spinner className={status === 'indexing' ? 'size-3 text-yellow-950' : 'size-3 text-muted-foreground'} />}
      </span>
      <span>{label}</span>
    </div>
  );
}
