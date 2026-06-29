import { useState } from 'react';
import { useAction, useQuery } from 'convex/react';
import { useParams, useNavigate } from 'react-router';
import { Globe, FileText, AlignLeft, HelpCircle, Info, Lightbulb, XIcon } from 'lucide-react';
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
import { ImageSection } from '@/components/knowledge-base/ImageSection';
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

export default function KnowledgeBasePage() {
  const { agentId, type: rawType } = useParams();
  const navigate = useNavigate();
  const type = (rawType && ['web', 'file', 'text', 'qa', 'media'].includes(rawType) ? rawType : 'web') as KnowledgeType;
  const selectedAgentId = agentId as Id<'agents'> | undefined;
  const { can } = usePermissions();
  const canManageKnowledgeBase = can(Permission.KB_MANAGE);

  const textEntries = useQuery(api.knowledgeBase.listTextEntries, selectedAgentId ? { agentId: selectedAgentId } : "skip");
  const fileEntries = useQuery(api.knowledgeBase.listFileEntries, selectedAgentId ? { agentId: selectedAgentId } : "skip");
  const webEntries = useQuery(api.knowledgeBase.listWebEntries, selectedAgentId ? { agentId: selectedAgentId } : "skip");
  const qaEntries = useQuery(api.knowledgeBase.listQAEntries, selectedAgentId ? { agentId: selectedAgentId } : "skip");
  const kbImages = useQuery(api.knowledgeBaseImages.listKbImagesByAgent, selectedAgentId ? { agentId: selectedAgentId } : "skip");

  const enqueueDelete = useAction(api.cloudflare.enqueueDelete);
  const enqueueImageDelete = useAction(api.knowledgeBaseImages.enqueueImageDelete);
  const deleteWebEntryGroup = useAction(api.cloudflare.deleteWebEntryGroup);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<
    | { type: 'web' | 'file' | 'text' | 'qa'; entryId: Id<any>; cfItemId?: string; isGroup?: boolean }
    | { type: 'media'; clientId: string }
    | null
  >(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const storageLimits = useQuery(api.knowledgeBase.getStorageLimit);
  const maxFileSize = storageLimits?.maxFileSize ?? 4 * 1024 * 1024;
  const maxTotalSize = storageLimits?.maxTotalSize ?? 4 * 1024 * 1024;

  const textCount = textEntries?.filter((e: any) => e.status === "completed").length ?? 0;
  const fileCount = fileEntries?.filter((e: any) => e.status === "completed").length ?? 0;
  const webCount = webEntries?.filter((e: any) => e.parentId && e.status === "completed").length ?? 0;
  const qaCount = qaEntries?.filter((e: any) => e.status === "completed").length ?? 0;
  const webSize = webEntries?.reduce((sum: number, e: any) => sum + (e.fileSize ?? 0), 0) ?? 0;
  const fileSizeVal = fileEntries?.reduce((sum: number, e: any) => sum + (e.fileSize ?? 0), 0) ?? 0;
  const textSize = textEntries?.reduce((sum: number, e: any) => sum + (e.fileSize ?? 0), 0) ?? 0;
  const qaSize = qaEntries?.reduce((sum: number, e: any) => sum + (e.fileSize ?? 0), 0) ?? 0;

  const mediaCount = kbImages?.filter((e: any) => e.status === "ready").length ?? 0;
  const mediaSize = kbImages?.reduce((sum: number, e: any) => sum + (e.fileSize ?? 0), 0) ?? 0;

  const totalFileSize = webSize + fileSizeVal + textSize + qaSize + mediaSize;

  const openDeleteDialog = (
    entryType: 'web' | 'file' | 'text' | 'qa' | 'media',
    entryId: Id<any> | string,
    cfItemId?: string,
    isGroup?: boolean,
  ) => {
    if (entryType === 'media') {
      setDeleteTarget({ type: 'media', clientId: entryId as string });
    } else {
      setDeleteTarget({ type: entryType, entryId: entryId as Id<any>, cfItemId, isGroup });
    }
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      if ('clientId' in deleteTarget) {
        await enqueueImageDelete({ clientId: deleteTarget.clientId });
        toast.success("Asset is now being deleted");
      } else if (deleteTarget.isGroup && deleteTarget.type === 'web') {
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
    { label: 'file', count: fileCount + mediaCount, size: fileSizeVal + mediaSize, icon: FileText },
    { label: 'text', count: textCount, size: textSize, icon: AlignLeft },
    { label: 'Q&A', count: qaCount, size: qaSize, icon: HelpCircle },
  ];
  const deleteDialogTitle = deleteTarget?.type === 'web' && deleteTarget.isGroup
    ? 'Remove URL and linked pages'
    : deleteTarget?.type === 'media'
      ? 'Remove media'
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
                    {type === 'media' && 'Send Media'}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {type === 'web' && 'Crawl websites and import pages as knowledge.'}
                    {type === 'file' && 'Upload documents for your agent to reference.'}
                    {type === 'text' && 'Write or paste raw text content directly.'}
                    {type === 'qa' && 'Add question and answer pairs your agent can learn from.'}
                    {type === 'media' && 'Upload images or PDFs here that your agent can reference or send directly to customers.'}
                  </p>
                </div>

                {type === 'file' && canManageKnowledgeBase && (
                  <button
                    type="button"
                    onClick={() => navigate(`/dashboard/${agentId}/knowledge-base/media`)}
                    className="flex flex-col gap-1 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-left transition-all hover:bg-amber-500/20 active:scale-[0.98] cursor-pointer shrink-0 max-w-[240px]"
                  >
                    <div className="flex items-center gap-1 text-[11px] font-bold text-amber-800 dark:text-amber-300">
                      <Lightbulb className="size-3.5 shrink-0" />
                      <span>Popular</span>
                    </div>
                    <span className="text-xs  text-amber-700 dark:text-amber-400">
                      Allow AI to send media?
                    </span>
                  </button>
                )}
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
            {type === 'media' && (
              <ImageSection
                agentId={selectedAgentId}
                openDeleteDialog={openDeleteDialog}
                maxFileSize={maxFileSize}
                type="media"
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
