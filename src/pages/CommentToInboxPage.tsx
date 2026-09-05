import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { useParams } from 'react-router';
import { Users } from 'lucide-react';
import type { Id } from '../../convex/_generated/dataModel';
import { api } from '../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CommentAutomationModal } from '@/components/comment-to-inbox/CommentAutomationModal';
import { CommentAutomationEmptyState } from '@/components/comment-to-inbox/CommentAutomationEmptyState';
import { CommentAutomationNoPagesEmptyState } from '@/components/comment-to-inbox/CommentAutomationNoPagesEmptyState';
import { toast } from 'sonner';

function isCommentAutomationPage<T extends { service: string }>(
  channel: T,
): channel is T & { service: 'instagram' | 'messenger' } {
  return channel.service === 'instagram' || channel.service === 'messenger';
}

function CommentToInboxPageSkeleton() {
  return (
    <div role="status" aria-label="Loading comment automations" className="grid gap-3">
      <span className="sr-only">Loading comment automations</span>
      {Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-16 w-full rounded-xl" />)}
    </div>
  );
}

export default function CommentToInboxPage() {
  const { agentId } = useParams();
  const automations = useQuery(api.commentAutomations.list);
  const channels = useQuery(api.commentAutomations.listPages);
  const setActive = useMutation(api.commentAutomations.setActive);
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<Id<'commentAutomations'> | null>(null);
  const detail = useQuery(
    api.commentAutomations.get,
    selectedId ? { automationId: selectedId, paginationOpts: { numItems: 20, cursor: null } } : 'skip',
  );
  const availablePages = channels?.filter(isCommentAutomationPage);

  if (!agentId) return null;

  const toggle = async (automationId: Id<'commentAutomations'>, active: boolean) => {
    try {
      await setActive({ automationId, active });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update automation');
    }
  };

  return (
    <TooltipProvider>
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-title text-3xl font-normal">Comment-to-Inbox</h1>
          <p className="mt-1 text-sm text-muted-foreground">Automatically send inbox messages when people comment on your posts.</p>
        </div>
        {availablePages?.length ? <Button onClick={() => setOpen(true)}>Create automation</Button> : null}
      </div>
      {automations === undefined || channels === undefined ? <CommentToInboxPageSkeleton /> : channels.length === 0 ? <CommentAutomationNoPagesEmptyState connectHref={`/dashboard/${agentId}/channels`} /> : automations.length === 0 ? <CommentAutomationEmptyState onCreate={() => setOpen(true)} /> : <div className="grid gap-2">
        {automations.map((automation) => <button key={automation._id} aria-label={`Open automation ${automation.name}`} onClick={() => setSelectedId(automation._id)} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 rounded-xl border px-4 py-3 text-left hover:bg-muted/40">
          <span className="font-medium">{automation.name}</span><Tooltip><TooltipTrigger asChild><span aria-label={`${automation.sentCount} messages sent`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"><Users className="size-4" aria-hidden="true" /><span>{automation.sentCount}</span></span></TooltipTrigger><TooltipContent side="top">{automation.sentCount} messages sent</TooltipContent></Tooltip><Switch checked={automation.status === 'active'} onClick={(event) => event.stopPropagation()} onCheckedChange={(active) => void toggle(automation._id, active)} />
        </button>)}
      </div>}
      {availablePages && <CommentAutomationModal key={selectedId !== null ? `${selectedId}-${detail ? 'loaded' : 'loading'}` : 'create'} automation={selectedId !== null ? detail?.automation : undefined} channels={availablePages} initialChannelIds={selectedId !== null ? detail?.pages.map((page) => page.channelId) : undefined} loading={selectedId !== null && detail === undefined} open={open || selectedId !== null} onOpenChange={(isOpen) => { if (!isOpen) { setOpen(false); setSelectedId(null); } }} />}
    </main>
    </TooltipProvider>
  );
}
