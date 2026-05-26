import { useEffect, useState, useCallback } from 'react';
import { useQuery, useAction } from 'convex/react';
import { useNavigate, useParams } from 'react-router';
import { Bot } from 'lucide-react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { TestChatWindow } from '@/components/TestChatWindow';
import { toast } from 'sonner';

export default function AgentPage() {
  const { agentId, threadId } = useParams();
  const selectedAgentId = agentId as Id<'agents'> | undefined;
  const navigate = useNavigate();

  const agent = useQuery(
    api.agents.get,
    selectedAgentId ? { agentId: selectedAgentId } : 'skip',
  );

  const getIndexingStatus = useAction(api.cloudflare.getIndexingStatus);
  const [indexingStatus, setIndexingStatus] = useState<{
    isIndexing: boolean;
    queued: number;
    running: number;
  } | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  const checkStatus = useCallback(async () => {
    setIsCheckingStatus(true);
    try {
      const result = await getIndexingStatus();
      setIndexingStatus({
        isIndexing: result.isIndexing,
        queued: result.queued ?? 0,
        running: result.running ?? 0,
      });
    } catch {
      toast.error('Failed to check agent status');
    } finally {
      setIsCheckingStatus(false);
    }
  }, [getIndexingStatus]);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(() => {
      checkStatus();
    }, 10000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  if (agent === undefined) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner className="size-6 text-muted-foreground" />
      </div>
    );
  }

  if (agent === null || !selectedAgentId) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <Bot className="mb-3 size-8 text-muted-foreground" />
        <h1 className="m-0 text-lg font-semibold">Agent not found</h1>
        <Button onClick={() => navigate('/workspace')} className="mt-5">
          Back to agents
        </Button>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6 max-w-none">
      <header className="flex flex-col justify-between gap-4 border-b border-border pb-6 sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="m-0 text-4xl font-semibold tracking-tight text-foreground">
            Playground
          </h1>
        </div>
      </header>

      <div className="w-full">
        <TestChatWindow
          agentId={agent._id}
          agentName={agent.name}
          threadId={threadId}
          indexingStatus={indexingStatus}
          isCheckingStatus={isCheckingStatus}
          onCheckStatus={checkStatus}
        />
      </div>
    </div>
  );
}
