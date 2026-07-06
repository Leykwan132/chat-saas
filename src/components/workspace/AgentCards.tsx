import { Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import type { Doc, Id } from '../../../convex/_generated/dataModel';
import { formatPrefixedRelativeAge } from '@/lib/formatRelativeAge';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { getAgentWorkspaceEntryPath } from './agentWorkspaceRoutes';

function AgentPreview() {
  return (
    <div className="relative h-32 overflow-hidden rounded-t-lg bg-[radial-gradient(circle_at_30%_20%,#60a5fa_0,#3b82f6_34%,#2563eb_62%,#1d4ed8_100%)]">
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.18),transparent_35%,rgba(255,255,255,0.2)_75%)]" />
      <div className="absolute left-1/2 top-8 w-40 -translate-x-1/2 overflow-hidden rounded-t-xl bg-white shadow-xl">
        <div className="h-7 bg-blue-500 px-2 py-1.5 text-[8px] font-medium text-white">
          agent
        </div>
        <div className="flex h-20 flex-col gap-2 px-2 py-2">
          <div className="h-4 w-20 rounded-full bg-zinc-100" />
          <div className="ml-auto h-4 w-20 rounded-full bg-blue-500" />
        </div>
      </div>
    </div>
  );
}

export function AgentCardSkeleton() {
  return (
    <div className="w-full overflow-hidden rounded-lg border border-border bg-card">
      <div className="relative h-32 overflow-hidden bg-muted/40 animate-pulse">
        <div className="absolute left-1/2 top-3 w-40 -translate-x-1/2 overflow-hidden rounded-t-xl bg-muted/20 border border-muted/30">
          <div className="h-7 bg-muted/30" />
          <div className="flex h-20 flex-col gap-2 px-2 py-2">
            <div className="h-4 w-20 rounded-full bg-muted/20 animate-pulse" />
            <div className="ml-auto h-4 w-20 rounded-full bg-muted/30 animate-pulse" />
          </div>
        </div>
      </div>
      <div className="flex items-start justify-between border-t border-border px-4 py-4">
        <div className="flex flex-1 flex-col gap-1.5">
          <div className="h-4 w-2/3 rounded-md bg-muted/40 animate-pulse" />
          <div className="h-3 w-1/2 rounded-md bg-muted/20 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export function CreateAgentCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-card px-3.5 py-3.5 transition-colors',
        'text-muted-foreground hover:border-foreground/20 hover:bg-muted/30 hover:text-foreground',
        'min-h-[9.5rem]',
      )}
      aria-label="Create a new AI agent"
    >
      <Plus className="size-6" strokeWidth={1.75} />
      <span className="text-xs font-medium">New AI agent</span>
    </button>
  );
}

export function AgentCard({
  agent,
  deletingId,
  onDelete,
  canDelete,
}: {
  agent: Doc<'agents'>;
  deletingId: Id<'agents'> | null;
  onDelete: (agentId: Id<'agents'>, agentName: string) => void;
  canDelete: boolean;
}) {
  const navigate = useNavigate();

  const handleCardClick = (event: React.MouseEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.target as Node)) return;
    navigate(getAgentWorkspaceEntryPath(agent._id));
  };

  return (
    <article
      className="group w-full cursor-pointer overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-foreground/30"
      onClick={handleCardClick}
    >
      <AgentPreview />
      <div className="flex items-start justify-between gap-3 border-t border-border px-4 py-4 transition-colors group-hover:bg-muted/20">
        <div className="min-w-0">
          <span className="block truncate text-sm font-semibold tracking-tight text-foreground">
            {agent.name}
          </span>
          <p className="m-0 mt-0.5 text-xs text-muted-foreground">
            {formatPrefixedRelativeAge('Created', agent.createdAt)}
          </p>
        </div>

        {canDelete && (
          <div className="flex items-center gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`Delete ${agent.name}`}
                  disabled={deletingId === agent._id}
                  onClick={(event) => event.stopPropagation()}
                >
                  {deletingId === agent._id ? (
                    <Spinner className="size-4" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent onClick={(event) => event.stopPropagation()}>
                <DialogHeader className="gap-2">
                  <DialogTitle className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                    Delete {agent.name}?
                  </DialogTitle>
                  <DialogDescription className="text-sm leading-relaxed">
                    This permanently removes the agent. You can&apos;t undo this action.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">Cancel</Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => onDelete(agent._id, agent.name)}
                    >
                      Delete
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    </article>
  );
}
