import { useCallback, useEffect, useState } from 'react';
import { useAction, useQuery } from 'convex/react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { TestChatWindow } from '@/components/TestChatWindow';
import { Spinner } from '@/components/ui/spinner';
import { usePermissions } from '@/hooks/usePermissions';
import { Permission } from '../../shared/permissions';
import { cn } from '@/lib/utils';

const PANEL_HEIGHT_CLASS = 'h-[calc(100svh-7rem)] min-h-[541px]';

type AgentPlaygroundPanelProps = {
  agentId: Id<'agents'>;
  className?: string;
};

export function AgentPlaygroundPanel({ agentId, className }: AgentPlaygroundPanelProps) {
  const { can, isLoading: permissionsLoading } = usePermissions();
  const [threadId, setThreadId] = useState<string | undefined>();
  const agent = useQuery(api.agents.get, { agentId });

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
    void checkStatus();
    const interval = setInterval(() => {
      void checkStatus();
    }, 10000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  if (permissionsLoading || !can(Permission.PLAYGROUND_ACCESS)) {
    return null;
  }

  if (agent === undefined) {
    return (
      <div
        className={cn(
          'sticky top-8 flex w-[360px] shrink-0 items-center justify-center border-l border-border bg-background',
          PANEL_HEIGHT_CLASS,
          className,
        )}
      >
        <Spinner className="size-5 text-muted-foreground" />
      </div>
    );
  }

  if (agent === null) {
    return null;
  }

  return (
    <motion.aside
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'sticky top-8 flex w-[360px] min-h-0 shrink-0 flex-col overflow-hidden border-l border-border bg-background shadow-xl',
        PANEL_HEIGHT_CLASS,
        className,
      )}
    >
      <span className="shrink-0 border-b border-border px-4 py-3 text-lg font-semibold tracking-tight text-foreground">
        Playground
      </span>
      <TestChatWindow
        agentId={agent._id}
        agentName={agent.name}
        threadId={threadId}
        embedded
        onThreadIdChange={setThreadId}
        indexingStatus={indexingStatus}
        isCheckingStatus={isCheckingStatus}
        onCheckStatus={checkStatus}
        fillContainer
      />
    </motion.aside>
  );
}
