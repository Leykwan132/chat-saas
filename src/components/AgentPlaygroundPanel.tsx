import { useState } from 'react';
import { useQuery } from 'convex/react';
import { X } from 'lucide-react';
import { motion } from 'motion/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { TestChatWindow } from '@/components/TestChatWindow';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import { usePermissions } from '@/hooks/usePermissions';
import { Permission } from '../../shared/permissions';
import { cn } from '@/lib/utils';

const PANEL_HEIGHT_CLASS = 'h-[calc(100svh-7rem)] min-h-[541px]';

type AgentPlaygroundPanelProps = {
  agentId: Id<'agents'>;
  className?: string;
  mode?: 'aside' | 'drawer' | 'inline';
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function AgentPlaygroundPanel({
  agentId,
  className,
  mode = 'aside',
  open = true,
  onOpenChange,
}: AgentPlaygroundPanelProps) {
  const { can, isLoading: permissionsLoading } = usePermissions();
  const [threadId, setThreadId] = useState<string | undefined>();
  const shouldLoadAgent = mode === 'aside' || open;
  const agent = useQuery(api.agents.get, shouldLoadAgent ? { agentId } : 'skip');

  const renderChat = (fillContainer: boolean, embedded: boolean) => {
    if (permissionsLoading) {
      return (
        <div className="flex size-full items-center justify-center">
          <Spinner className="size-5 text-muted-foreground" />
        </div>
      );
    }

    if (!can(Permission.PLAYGROUND_ACCESS)) {
      return (
        <div className="flex size-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
          You don&apos;t have permission to test this agent.
        </div>
      );
    }

    if (agent === undefined) {
      return (
        <div className="flex size-full items-center justify-center">
          <Spinner className="size-5 text-muted-foreground" />
        </div>
      );
    }

    if (agent === null) {
      return null;
    }

    return (
      <TestChatWindow
        agentId={agent._id}
        agentName={agent.name}
        threadId={threadId}
        embedded={embedded}
        onThreadIdChange={setThreadId}
        fillContainer={fillContainer}
      />
    );
  };

  if (mode === 'drawer') {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className={cn(
            'w-[min(100vw,440px)] overflow-hidden p-0 sm:max-w-[440px]',
            className,
          )}
        >
          <SheetHeader className="shrink-0 border-b border-border p-4 pr-14">
            <SheetTitle>Test Agent</SheetTitle>
            <SheetDescription>
              Chat with the agent using the current saved setup.
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-hidden">
            {renderChat(true, false)}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  if (mode === 'inline') {
    if (!open) return null;

    return (
      <motion.section
        initial={{ opacity: 0, x: 28 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className={cn('flex min-w-0 flex-col gap-3', className)}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="m-0 text-lg font-semibold tracking-tight text-foreground">
            Test
          </h2>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => onOpenChange?.(false)}
            aria-label="Close test"
            title="Close test"
          >
            <X />
          </Button>
        </div>
        <div className="h-[min(744px,calc(100svh-10rem))] min-h-[541px] overflow-hidden rounded-lg border border-border bg-card">
          {renderChat(true, true)}
        </div>
      </motion.section>
    );
  }

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
      {renderChat(true, true)}
    </motion.aside>
  );
}
