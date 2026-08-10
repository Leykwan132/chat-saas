import { Check } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import {
  getAgentTrainingDescription,
  getAgentTrainingLabel,
  getAgentTrainingStatus,
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

export function KnowledgeBaseTrainingStatus({ indexingStatus, isCheckingStatus }: KnowledgeBaseTrainingStatusProps) {
  const status = getAgentTrainingStatus(isCheckingStatus, indexingStatus);
  const label = status === 'loading'
    ? 'Checking status…'
    : status === 'indexing'
      ? getAgentTrainingLabel(indexingStatus!)
      : 'Your agent is ready.';
  const detail = getAgentTrainingDescription(status);
  const title = status === 'loading'
    ? 'Checking training status'
    : status === 'indexing'
      ? 'Training in progress'
      : 'Agent is up-to-date';

  return (
    <HoverCard openDelay={150} closeDelay={100}>
      <HoverCardTrigger asChild>
        <div role="status" tabIndex={0} className="inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className={status === 'ready' ? 'flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-600' : status === 'indexing' ? 'flex size-5 shrink-0 items-center justify-center rounded-full bg-yellow-400' : 'flex size-5 shrink-0 items-center justify-center rounded-full bg-muted-foreground/20'}>
            {status === 'ready' ? <Check className="size-3.5 text-white" /> : <Spinner className={status === 'indexing' ? 'size-3 text-yellow-950' : 'size-3 text-muted-foreground'} />}
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
