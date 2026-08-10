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
  onTest: () => void;
};

export function KnowledgeBaseTrainingStatus({ indexingStatus, isCheckingStatus, onTest }: KnowledgeBaseTrainingStatusProps) {
  const status = getAgentTrainingStatus(isCheckingStatus, indexingStatus);
  const label = status === 'loading'
    ? 'Checking status…'
    : status === 'indexing'
      ? getAgentTrainingLabel(indexingStatus!)
      : 'Your agent is ready.';

  return (
    <button type="button" aria-label="Test your agent" onClick={onTest} className="inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted-foreground/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <span className={status === 'ready' ? 'flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-600' : status === 'indexing' ? 'flex size-5 shrink-0 items-center justify-center rounded-full bg-yellow-400' : 'flex size-5 shrink-0 items-center justify-center rounded-full bg-muted-foreground/20'}>
        {status === 'ready' ? <Check className="size-3.5 text-white" /> : <Spinner className={status === 'indexing' ? 'size-3 text-yellow-950' : 'size-3 text-muted-foreground'} />}
      </span>
      <span>{label}</span>
    </button>
  );
}
