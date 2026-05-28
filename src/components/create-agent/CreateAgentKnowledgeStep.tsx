import { useState } from 'react';
import { useAction, useQuery } from 'convex/react';
import { AlignLeft, FileText, Globe, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { WebSection } from '@/components/knowledge-base/WebSection';
import { FileSection } from '@/components/knowledge-base/FileSection';
import { TextSection } from '@/components/knowledge-base/TextSection';
import { QASection } from '@/components/knowledge-base/QASection';
import { cn } from '@/lib/utils';

export type CreateAgentKnowledgeTab = 'web' | 'file' | 'text' | 'qa';

const KNOWLEDGE_TABS: {
  type: CreateAgentKnowledgeTab;
  label: string;
  icon: React.ElementType;
}[] = [
  { type: 'web', label: 'Web', icon: Globe },
  { type: 'file', label: 'Files', icon: FileText },
  { type: 'text', label: 'Text', icon: AlignLeft },
  { type: 'qa', label: 'Q&A', icon: HelpCircle },
];

const TAB_COPY: Record<
  CreateAgentKnowledgeTab,
  { heading: string; description: string }
> = {
  web: {
    heading: 'Web Sources',
    description: 'Crawl websites and import pages as knowledge.',
  },
  file: {
    heading: 'Files',
    description: 'Upload documents for your agent to reference.',
  },
  text: {
    heading: 'Text',
    description: 'Write or paste raw text content directly.',
  },
  qa: {
    heading: 'Q&A',
    description: 'Add question and answer pairs your agent can learn from.',
  },
};

type CreateAgentKnowledgeStepProps = {
  agentId: Id<'agents'>;
  activeTab: CreateAgentKnowledgeTab;
  onActiveTabChange: (tab: CreateAgentKnowledgeTab) => void;
};

export function CreateAgentKnowledgeStep({
  agentId,
  activeTab,
  onActiveTabChange,
}: CreateAgentKnowledgeStepProps) {
  const textEntries = useQuery(api.knowledgeBase.listTextEntries, { agentId });
  const fileEntries = useQuery(api.knowledgeBase.listFileEntries, { agentId });
  const webEntries = useQuery(api.knowledgeBase.listWebEntries, { agentId });
  const qaEntries = useQuery(api.knowledgeBase.listQAEntries, { agentId });
  const storageLimits = useQuery(api.knowledgeBase.getStorageLimit);

  const enqueueDelete = useAction(api.cloudflare.enqueueDelete);
  const deleteWebEntryGroup = useAction(api.cloudflare.deleteWebEntryGroup);

  const maxFileSize = storageLimits?.maxFileSize ?? 4 * 1024 * 1024;

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<
    | { type: 'web' | 'file' | 'text' | 'qa'; entryId: Id<any>; cfItemId?: string; isGroup?: boolean }
    | null
  >(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const openDeleteDialog = (
    entryType: 'web' | 'file' | 'text' | 'qa' | 'media',
    entryId: Id<any> | string,
    cfItemId?: string,
    isGroup?: boolean,
  ) => {
    if (entryType === 'media') return;
    setDeleteTarget({ type: entryType, entryId: entryId as Id<any>, cfItemId, isGroup });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.isGroup && deleteTarget.type === 'web') {
        await deleteWebEntryGroup({ parentId: deleteTarget.entryId });
        toast.success('URL group is now being deleted');
      } else {
        await enqueueDelete({
          entryId: deleteTarget.entryId,
          entryType: deleteTarget.type,
          cfItemId: deleteTarget.cfItemId,
        });
        toast.success('Item is now being deleted');
      }
    } catch {
      toast.error('Failed to delete item');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  };

  return (
    <>
      <div className="grid gap-6 md:grid-cols-[168px_minmax(0,1fr)]">
        <div className="flex flex-col gap-2">
          <span className="px-1 text-[11px] font-semibold text-muted-foreground">
            Reference Knowledge
          </span>
          <nav className="flex flex-col gap-1">
            {KNOWLEDGE_TABS.map(({ type, label, icon: Icon }) => {
              const isActive = activeTab === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => onActiveTabChange(type)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-secondary font-semibold text-secondary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="min-w-0 flex flex-col gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">{TAB_COPY[activeTab].heading}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{TAB_COPY[activeTab].description}</p>
            <Separator className="mt-4" />
          </div>

          {activeTab === 'web' && (
            <WebSection entries={webEntries} agentId={agentId} openDeleteDialog={openDeleteDialog} />
          )}
          {activeTab === 'file' && (
            <FileSection
              entries={fileEntries}
              agentId={agentId}
              openDeleteDialog={openDeleteDialog}
              maxFileSize={maxFileSize}
            />
          )}
          {activeTab === 'text' && (
            <TextSection entries={textEntries} agentId={agentId} openDeleteDialog={openDeleteDialog} />
          )}
          {activeTab === 'qa' && (
            <QASection entries={qaEntries} agentId={agentId} openDeleteDialog={openDeleteDialog} />
          )}
        </div>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete entry</DialogTitle>
            <DialogDescription>
              {deleteTarget?.type === 'web' && deleteTarget.isGroup
                ? 'Are you sure you want to delete this URL and all its discovered links? This action cannot be undone.'
                : 'Are you sure you want to delete this entry? This action cannot be undone.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleDeleteConfirm()}
              disabled={isDeleting}
            >
              {isDeleting ? <Spinner className="size-4" /> : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function useCreateAgentKnowledgeCounts(agentId: Id<'agents'> | null) {
  const textEntries = useQuery(
    api.knowledgeBase.listTextEntries,
    agentId ? { agentId } : 'skip',
  );
  const fileEntries = useQuery(
    api.knowledgeBase.listFileEntries,
    agentId ? { agentId } : 'skip',
  );
  const webEntries = useQuery(
    api.knowledgeBase.listWebEntries,
    agentId ? { agentId } : 'skip',
  );
  const qaEntries = useQuery(
    api.knowledgeBase.listQAEntries,
    agentId ? { agentId } : 'skip',
  );

  return {
    web: webEntries?.filter((entry: any) => !entry.parentId).length ?? 0,
    file: fileEntries?.length ?? 0,
    text: textEntries?.length ?? 0,
    qa: qaEntries?.length ?? 0,
  };
}
