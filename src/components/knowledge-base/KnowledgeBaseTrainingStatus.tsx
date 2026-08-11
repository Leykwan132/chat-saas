import { Check } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import {
  getAgentTrainingDescription,
  getAgentTrainingLabel,
  type AgentIndexingStatus,
} from '@/lib/agentIndexingStatus';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';

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
  const title = status === 'indexing' ? 'Training in progress' : 'Agent is ready';
  const detail = getAgentTrainingDescription(status);

  return (
    <HoverCard openDelay={150} closeDelay={100}>
      <HoverCardTrigger asChild>
        <div role="status" tabIndex={0} className="inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className={status === 'ready' ? 'flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-600' : 'flex size-5 shrink-0 items-center justify-center rounded-full bg-yellow-400'}>
            {status === 'ready' ? <Check className="size-3.5 text-white" /> : <Spinner className="size-3 text-yellow-950" />}
          </span>
          <span>{label}</span>
        </div>
      </HoverCardTrigger>
      <HoverCardContent align="end" className="w-72">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
      </HoverCardContent>
    </HoverCard>
  );
}
