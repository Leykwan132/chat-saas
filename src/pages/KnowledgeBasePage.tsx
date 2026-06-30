import { useState } from 'react';
import { useAction, useQuery } from 'convex/react';
import { useParams, useNavigate } from 'react-router';
import { Globe, FileText, AlignLeft, HelpCircle, Info, XIcon } from 'lucide-react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { toast } from 'sonner';
import { PageDescription } from '@/components/PageDescription';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { WebSection } from '@/components/knowledge-base/WebSection';
import { FileSection } from '@/components/knowledge-base/FileSection';
import { TextSection } from '@/components/knowledge-base/TextSection';
import { QASection } from '@/components/knowledge-base/QASection';
import {
  KnowledgeBaseNavigation,
  type KnowledgeType,
} from '@/components/knowledge-base/KnowledgeBaseNavigation';
import { KnowledgeBaseStoragePanel } from '@/components/knowledge-base/KnowledgeBaseStoragePanel';
import { usePermissions } from '@/hooks/usePermissions';
import { Permission } from '../../shared/permissions';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type KnowledgeEntryId =
  | Id<'webEntries'>
  | Id<'fileEntries'>
  | Id<'textEntries'>
  | Id<'qaEntries'>;

type DeleteTarget =
  | { type: 'web'; entryId: Id<'webEntries'>; cfItemId?: string; isGroup?: boolean }
  | { type: 'file'; entryId: Id<'fileEntries'>; cfItemId?: string; isGroup?: boolean }
  | { type: 'text'; entryId: Id<'textEntries'>; cfItemId?: string; isGroup?: boolean }
  | { type: 'qa'; entryId: Id<'qaEntries'>; cfItemId?: string; isGroup?: boolean };

export default function KnowledgeBasePage() {
  const { agentId, type: rawType } = useParams();
  const navigate = useNavigate();
  const type = (rawType && ['web', 'file', 'text', 'qa'].includes(rawType) ? rawType : 'web') as KnowledgeType;
  const selectedAgentId = agentId as Id<'agents'> | undefined;
  const { can } = usePermissions();
  const canManageKnowledgeBase = can(Permission.KB_MANAGE);

  const textEntries = useQuery(api.knowledgeBase.listTextEntries, selectedAgentId ? { agentId: selectedAgentId } : "skip");
  const fileEntries = useQuery(api.knowledgeBase.listFileEntries, selectedAgentId ? { agentId: selectedAgentId } : "skip");
  const webEntries = useQuery(api.knowledgeBase.listWebEntries, selectedAgentId ? { agentId: selectedAgentId } : "skip");
  const qaEntries = useQuery(api.knowledgeBase.listQAEntries, selectedAgentId ? { agentId: selectedAgentId } : "skip");

  const enqueueDelete = useAction(api.cloudflare.enqueueDelete);
  const deleteWebEntryGroup = useAction(api.cloudflare.deleteWebEntryGroup);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const storageLimits = useQuery(api.knowledgeBase.getStorageLimit);
  const maxFileSize = storageLimits?.maxFileSize ?? 4 * 1024 * 1024;
  const maxTotalSize = storageLimits?.maxTotalSize ?? 4 * 1024 * 1024;

  const textCount = textEntries?.filter((entry) => entry.status === "completed").length ?? 0;
  const fileCount = fileEntries?.filter((entry) => entry.status === "completed").length ?? 0;
  const webCount = webEntries?.filter((entry) => entry.parentId && entry.status === "completed").length ?? 0;
  const qaCount = qaEntries?.filter((entry) => entry.status === "completed").length ?? 0;
  const webSize = webEntries?.reduce((sum, entry) => sum + (entry.fileSize ?? 0), 0) ?? 0;
  const fileSizeVal = fileEntries?.reduce((sum, entry) => sum + (entry.fileSize ?? 0), 0) ?? 0;
  const textSize = textEntries?.reduce((sum, entry) => sum + (entry.fileSize ?? 0), 0) ?? 0;
  const qaSize = qaEntries?.reduce((sum, entry) => sum + (entry.fileSize ?? 0), 0) ?? 0;

  const totalFileSize = webSize + fileSizeVal + textSize + qaSize;

  const openDeleteDialog = (
    entryType: 'web' | 'file' | 'text' | 'qa' | 'media',
    entryId: KnowledgeEntryId | string,
    cfItemId?: string,
    isGroup?: boolean,
  ) => {
    if (entryType === 'media') {
      throw new Error('Send Media is managed from Workflow');
    }
    if (entryType === 'web') {
      setDeleteTarget({ type: entryType, entryId: entryId as Id<'webEntries'>, cfItemId, isGroup });
    } else if (entryType === 'file') {
      setDeleteTarget({ type: entryType, entryId: entryId as Id<'fileEntries'>, cfItemId, isGroup });
    } else if (entryType === 'text') {
      setDeleteTarget({ type: entryType, entryId: entryId as Id<'textEntries'>, cfItemId, isGroup });
    } else {
      setDeleteTarget({ type: entryType, entryId: entryId as Id<'qaEntries'>, cfItemId, isGroup });
    }
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.isGroup && deleteTarget.type === 'web') {
        await deleteWebEntryGroup({ parentId: deleteTarget.entryId });
        toast.success("URL group is now being deleted");
      } else {
        await enqueueDelete({ entryId: deleteTarget.entryId, entryType: deleteTarget.type, cfItemId: deleteTarget.cfItemId });
        toast.success("Item is now being deleted");
      }
    } catch {
      toast.error("Failed to delete item");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  };

  const statRows = [
    { label: 'web', count: webCount, size: webSize, icon: Globe },
    { label: 'file', count: fileCount, size: fileSizeVal, icon: FileText },
    { label: 'text', count: textCount, size: textSize, icon: AlignLeft },
    { label: 'Q&A', count: qaCount, size: qaSize, icon: HelpCircle },
  ];
  const deleteDialogTitle = deleteTarget?.type === 'web' && deleteTarget.isGroup
    ? 'Remove URL and linked pages'
    : 'Remove knowledge item';

  return (
    <>
      <div className="flex w-full flex-col gap-6">
        <header className="flex flex-col justify-between gap-4 border-b border-border pb-6 md:flex-row md:items-end">
          <div>
            <h1 className="m-0 text-4xl font-semibold tracking-tight text-foreground">Knowledge Base</h1>
            <PageDescription>
              Add content your AI can reference when answering customer questions.
            </PageDescription>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[252px_minmax(0,1fr)] xl:grid-cols-[252px_minmax(0,1fr)_280px]">
          <KnowledgeBaseNavigation
            activeType={type}
            onSelect={(nextType) => navigate(`/dashboard/${agentId}/knowledge-base/${nextType}`)}
          />

          <div className="flex flex-col gap-4 min-w-0">
            <div>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground">
                    {type === 'web' && 'Web Sources'}
                    {type === 'file' && (
                      <span className="flex items-center gap-1.5">
                        Files
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="rounded-full p-0.5 text-muted-foreground hover:text-foreground transition-colors" aria-label="Reference files information">
                                <Info className="size-4 shrink-0" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs text-left font-normal normal-case">
                              These files are only used to build the knowledge base of the AI agent and won't be sent to the customer directly.
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </span>
                    )}
                    {type === 'text' && 'Text'}
                    {type === 'qa' && 'Q&A'}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {type === 'web' && 'Crawl websites and import pages as knowledge.'}
                    {type === 'file' && 'Upload documents for your agent to reference.'}
                    {type === 'text' && 'Write or paste raw text content directly.'}
                    {type === 'qa' && 'Add question and answer pairs your agent can learn from.'}
                  </p>
                </div>
              </div>

              <Separator className="mt-4" />
            </div>
            {type === 'web' && (
              <WebSection
                entries={webEntries}
                agentId={selectedAgentId}
                openDeleteDialog={openDeleteDialog}
                canManage={canManageKnowledgeBase}
              />
            )}
            {type === 'file' && (
              <FileSection
                entries={fileEntries}
                agentId={selectedAgentId}
                openDeleteDialog={openDeleteDialog}
                maxFileSize={maxFileSize}
                canManage={canManageKnowledgeBase}
              />
            )}
            {type === 'text' && (
              <TextSection
                entries={textEntries}
                agentId={selectedAgentId}
                openDeleteDialog={openDeleteDialog}
                canManage={canManageKnowledgeBase}
              />
            )}
            {type === 'qa' && (
              <QASection
                entries={qaEntries}
                agentId={selectedAgentId}
                openDeleteDialog={openDeleteDialog}
                canManage={canManageKnowledgeBase}
              />
            )}
          </div>

          <KnowledgeBaseStoragePanel
            rows={statRows}
            totalFileSize={totalFileSize}
            maxTotalSize={maxTotalSize}
            className="lg:col-start-2 xl:col-start-auto"
          />
        </div>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogClose asChild>
            <Button type="button" variant="ghost" size="icon-sm" className="absolute right-4 top-4 rounded-full" aria-label="Close">
              <XIcon />
            </Button>
          </DialogClose>
          <DialogHeader>
            <DialogTitle>{deleteDialogTitle}</DialogTitle>
            <DialogDescription>
              {deleteTarget?.type === 'web' && deleteTarget.isGroup
                ? "Are you sure you want to delete this URL and all its discovered links? This action cannot be undone."
                : "Are you sure you want to delete this entry? This action cannot be undone."}
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
              {isDeleting ? <Spinner className="size-4" /> : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
