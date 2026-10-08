import { Astroid, UserRoundCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';

type InboxAiHandlingBarProps = {
  agentName: string | undefined;
  canTakeControl: boolean;
  takingControl: boolean;
  onTakeControl: () => void;
};

export function InboxAiHandlingBar({
  agentName,
  canTakeControl,
  takingControl,
  onTakeControl,
}: InboxAiHandlingBarProps) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-border bg-muted/50 p-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Astroid className="size-4" aria-hidden />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5" role="status">
        {agentName === undefined ? (
          <Skeleton className="h-4 w-24" />
        ) : (
          <span className="truncate text-sm font-medium text-foreground" title={agentName}>
            {agentName}
          </span>
        )}
        <span className="text-xs text-muted-foreground">Handling this conversation</span>
      </div>
      <Button
        type="button"
        size="sm"
        disabled={!canTakeControl || takingControl}
        onClick={onTakeControl}
        aria-busy={takingControl}
      >
        {takingControl ? <Spinner data-icon="inline-start" /> : <UserRoundCheck data-icon="inline-start" />}
        {takingControl ? 'Taking control…' : 'Take control'}
      </Button>
    </div>
  );
}
