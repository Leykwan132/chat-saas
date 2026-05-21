import { useState } from 'react';
import { useAction, useQuery } from 'convex/react';
import { useParams, useNavigate } from 'react-router';
import { ArrowRight, Globe, FileText, AlignLeft, HelpCircle, File, Info, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { toast } from "sonner";
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatFileSize } from '@/components/knowledge-base/helpers';
import { Separator } from '@/components/ui/separator';
import { WebSection } from '@/components/knowledge-base/WebSection';
import { FileSection } from '@/components/knowledge-base/FileSection';
import { TextSection } from '@/components/knowledge-base/TextSection';
import { QASection } from '@/components/knowledge-base/QASection';
import { ImageSection } from '@/components/knowledge-base/ImageSection';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ─── Config ────────────────────────────────────────────────────

type KnowledgeType = 'web' | 'file' | 'text' | 'qa' | 'media';

const KNOWLEDGE_TABS: { type: KnowledgeType; label: string; icon: React.ElementType }[] = [
  { type: 'web', label: 'Web', icon: Globe },
  { type: 'file', label: 'Files', icon: FileText },
  { type: 'text', label: 'Text', icon: AlignLeft },
  { type: 'qa', label: 'Q&A', icon: HelpCircle },
];

const MEDIA_TABS: { type: KnowledgeType; label: string; icon: React.ElementType }[] = [
  { type: 'media', label: 'Files', icon: File },
];

// ─── Main Page ──────────────────────────────────────────────────

export default function KnowledgeBasePage() {
  const { agentId, type: rawType } = useParams();
  const navigate = useNavigate();
  const type = (rawType && ['web', 'file', 'text', 'qa', 'media'].includes(rawType) ? rawType : 'web') as KnowledgeType;
  const selectedAgentId = agentId as Id<'agents'> | undefined;

  const textEntries = useQuery(api.knowledgeBase.listTextEntries, selectedAgentId ? { agentId: selectedAgentId } : "skip");
  const fileEntries = useQuery(api.knowledgeBase.listFileEntries, selectedAgentId ? { agentId: selectedAgentId } : "skip");
  const webEntries = useQuery(api.knowledgeBase.listWebEntries, selectedAgentId ? { agentId: selectedAgentId } : "skip");
  const qaEntries = useQuery(api.knowledgeBase.listQAEntries, selectedAgentId ? { agentId: selectedAgentId } : "skip");
  const kbImages = useQuery(api.knowledgeBaseImages.listKbImagesByAgent, selectedAgentId ? { agentId: selectedAgentId } : "skip");

  const enqueueDelete = useAction(api.cloudflare.enqueueDelete);
  const enqueueImageDelete = useAction(api.knowledgeBaseImages.enqueueImageDelete);
  const deleteWebEntryGroup = useAction(api.cloudflare.deleteWebEntryGroup);

  // ── Delete dialog state ──
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

  // ── Stats ──
  const textCount = textEntries?.filter(e => e.status === "completed").length ?? 0;
  const fileCount = fileEntries?.filter(e => e.status === "completed").length ?? 0;
  const webCount = webEntries?.filter(e => e.parentId && e.status === "completed").length ?? 0;
  const qaCount = qaEntries?.filter(e => e.status === "completed").length ?? 0;
  const webSize = webEntries?.reduce((sum, e) => sum + (e.fileSize ?? 0), 0) ?? 0;
  const fileSizeVal = fileEntries?.reduce((sum, e) => sum + (e.fileSize ?? 0), 0) ?? 0;
  const textSize = textEntries?.reduce((sum, e) => sum + (e.fileSize ?? 0), 0) ?? 0;
  const qaSize = qaEntries?.reduce((sum, e) => sum + (e.fileSize ?? 0), 0) ?? 0;

  const mediaCount = kbImages?.filter(e => e.status === "ready").length ?? 0;
  const mediaSize = kbImages?.reduce((sum, e) => sum + (e.fileSize ?? 0), 0) ?? 0;

  const totalFileSize = webSize + fileSizeVal + textSize + qaSize + mediaSize;

  // ── Shared delete handler ──
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
    } catch { toast.error("Failed to delete item"); } finally {
      setIsDeleting(false); setDeleteDialogOpen(false); setDeleteTarget(null);
    }
  };

  const statRows = [
    { label: 'web', count: webCount, size: webSize, icon: Globe },
    { label: 'file', count: fileCount + mediaCount, size: fileSizeVal + mediaSize, icon: FileText },
    { label: 'text', count: textCount, size: textSize, icon: AlignLeft },
    { label: 'Q&A', count: qaCount, size: qaSize, icon: HelpCircle },
  ];

  return (
    <>
      <div className="flex w-full flex-col gap-6">
        <header className="flex flex-col justify-between gap-4 border-b border-border pb-6 md:flex-row md:items-end">
          <div>
            <h1 className="m-0 text-2xl font-bold tracking-tight">Knowledge Base</h1>
            <p className="m-0 mt-1 text-sm text-muted-foreground">Add and manage knowledge sources for your agent.</p>
          </div>
          <Button onClick={() => navigate(`/dashboard/${agentId}/playground`)}>
            Test in playground
            <ArrowRight className="size-4" />
          </Button>
        </header>

        <div className="grid gap-6 lg:grid-cols-[220px_1fr_220px]">
          {/* LEFT: Nav tabs */}
          <div className="flex flex-col gap-6">
            {/* Reference Knowledge container */}
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-semibold text-muted-foreground px-3">
                Reference Knowledge
              </span>
              <nav className="flex flex-col gap-1">
                {KNOWLEDGE_TABS.map(({ type: tabType, label, icon: Icon }) => {
                  const isActive = type === tabType;
                  return (
                    <button
                      key={tabType}
                      onClick={() => navigate(`/dashboard/${agentId}/knowledge-base/${tabType}`)}
                      className={cn(
                        'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors text-left w-full',
                        isActive
                          ? 'bg-foreground text-background'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      {label}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Send media section */}
            <div className="flex flex-col gap-2 mt-2">
              <span className="text-[11px] font-semibold text-muted-foreground px-3">
                Send Media
              </span>
              <nav className="flex flex-col gap-1">
                {MEDIA_TABS.map(({ type: tabType, label, icon: Icon }) => {
                  const isActive = type === tabType;
                  return (
                    <button
                      key={tabType}
                      onClick={() => navigate(`/dashboard/${agentId}/knowledge-base/${tabType}`)}
                      className={cn(
                        'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors text-left w-full',
                        isActive
                          ? 'bg-foreground text-background'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      {label}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* MIDDLE: Type-specific content */}
          <div className="flex flex-col gap-4 min-w-0">
            <div>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
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

                {type === 'file' && (
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
            {type === 'web' && <WebSection entries={webEntries} agentId={selectedAgentId} openDeleteDialog={openDeleteDialog} />}
            {type === 'file' && <FileSection entries={fileEntries} agentId={selectedAgentId} openDeleteDialog={openDeleteDialog} maxFileSize={maxFileSize} />}
            {type === 'text' && <TextSection entries={textEntries} agentId={selectedAgentId} openDeleteDialog={openDeleteDialog} />}
            {type === 'qa' && <QASection entries={qaEntries} agentId={selectedAgentId} openDeleteDialog={openDeleteDialog} />}
            {type === 'media' && <ImageSection agentId={selectedAgentId} openDeleteDialog={openDeleteDialog} maxFileSize={maxFileSize} type="media" />}
          </div>

          {/* RIGHT: Storage limit + stats */}
          <div className="flex flex-col gap-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-foreground" />
                <h2 className="text-sm font-semibold text-foreground">Storage limit</h2>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Storage used</span>
                  <span>{formatFileSize(totalFileSize)} of {formatFileSize(maxTotalSize)}</span>
                </div>
                <Progress value={Math.min((totalFileSize / maxTotalSize) * 100, 100)} className="h-1" />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {statRows.map(({ label, count, size, icon: Icon }) => (
                <div key={label} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Icon className="size-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">{count} {label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">{formatFileSize(size)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Delete Dialog ── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete entry</DialogTitle>
            <DialogDescription>
              {deleteTarget?.type === 'web' && deleteTarget.isGroup
                ? "Are you sure you want to delete this URL and all its discovered links? This action cannot be undone."
                : "Are you sure you want to delete this entry? This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>Cancel</Button>
            <Button type="button" variant="destructive" onClick={() => void handleDeleteConfirm()} disabled={isDeleting}>{isDeleting ? <Spinner className="size-4" /> : "Delete"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
