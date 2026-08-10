import { useAction } from 'convex/react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import type { AgentIndexingStatus } from '@/lib/agentIndexingStatus';

const INDEXING_STATUS_POLL_INTERVAL_MS = 10_000;

type UseAgentIndexingStatusOptions = {
  enabled: boolean;
};

export function useAgentIndexingStatus({ enabled }: UseAgentIndexingStatusOptions) {
  const getIndexingStatus = useAction(api.cloudflare.getIndexingStatus);
  const [indexingStatus, setIndexingStatus] = useState<AgentIndexingStatus | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  const checkStatus = useCallback(async () => {
    setIsCheckingStatus(true);
    try {
      const result = await getIndexingStatus();
      setIndexingStatus({
        isIndexing: result.isIndexing,
        queued: result.queued,
        running: result.running,
      });
    } catch {
      toast.error('Failed to check agent status');
    } finally {
      setIsCheckingStatus(false);
    }
  }, [getIndexingStatus]);

  useEffect(() => {
    if (!enabled) return;
    void checkStatus();
    const interval = setInterval(() => {
      void checkStatus();
    }, INDEXING_STATUS_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [checkStatus, enabled]);

  return { indexingStatus, isCheckingStatus, checkStatus };
}
