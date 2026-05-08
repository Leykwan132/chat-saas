import { useState } from 'react';
import { useAction, useQuery } from 'convex/react';
import { useParams, useNavigate } from 'react-router';
import { ArrowRight } from 'lucide-react';

import {
  Globe,
  FileText,
  AlignLeft,
  HelpCircle,
  BookOpen,
} from 'lucide-react';
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
import { WebSection } from '@/components/knowledge-base/WebSection';
import { FileSection } from '@/components/knowledge-base/FileSection';
import { TextSection } from '@/components/knowledge-base/TextSection';
import { QASection } from '@/components/knowledge-base/QASection';

// ─── Config ────────────────────────────────────────────────────

type KnowledgeType = 'web' | 'file' | 'text' | 'qa';

const TYPE_CONFIG: Record<KnowledgeType, { label: string }> = {
  web: { label: 'Web' },
  file: { label: 'Files' },
  text: { label: 'Text' },
  qa: { label: 'Q&A' },
};

// ─── Main Page ──────────────────────────────────────────────────

export default function KnowledgeBasePage() {
  const { agentId, type: rawType } = useParams();
  const navigate = useNavigate();
  const type = (rawType ?? 'web') as KnowledgeType;
  const selectedAgentId = agentId as Id<'agents'> | undefined;
  const config = TYPE_CONFIG[type];

  const textEntries = useQuery(api.knowledgeBase.listTextEntries, selectedAgentId ? { agentId: selectedAgentId } : "skip");
  const fileEntries = useQuery(api.knowledgeBase.listFileEntries, selectedAgentId ? { agentId: selectedAgentId } : "skip");
  const webEntries = useQuery(api.knowledgeBase.listWebEntries, selectedAgentId ? { agentId: selectedAgentId } : "skip");
  const qaEntries = useQuery(api.knowledgeBase.listQAEntries, selectedAgentId ? { agentId: selectedAgentId } : "skip");

  const enqueueDelete = useAction(api.cloudflare.enqueueDelete);
  const deleteWebEntryGroup = useAction(api.cloudflare.deleteWebEntryGroup);

  // ── Delete dialog state ──
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'web' | 'file' | 'text' | 'qa'; entryId: Id<any>; cfItemId?: string; isGroup?: boolean } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const storageLimits = useQuery(api.knowledgeBase.getStorageLimit);
  const maxFileSize = storageLimits?.maxFileSize ?? 4 * 1024 * 1024;
  const maxTotalSize = storageLimits?.maxTotalSize ?? 4 * 1024 * 1024;

  // ── Stats ──
  const textCount = (textEntries ?? []).filter(e => e.status === "completed").length;
  const fileCount = (fileEntries ?? []).filter(e => e.status === "completed").length;
  const webCount = (webEntries ?? []).filter(e => e.parentId && e.status === "completed").length;
  const qaCount = (qaEntries ?? []).filter(e => e.status === "completed").length;
  const webSize = (webEntries ?? []).reduce((sum, e) => sum + (e.fileSize ?? 0), 0);
  const fileSizeVal = (fileEntries ?? []).reduce((sum, e) => sum + (e.fileSize ?? 0), 0);
  const textSize = (textEntries ?? []).reduce((sum, e) => sum + (e.fileSize ?? 0), 0);
  const qaSize = (qaEntries ?? []).reduce((sum, e) => sum + (e.fileSize ?? 0), 0);
  const totalFileSize = webSize + fileSizeVal + textSize + qaSize;

  // ── Shared delete handler ──
  const openDeleteDialog = (entryType: 'web' | 'file' | 'text' | 'qa', entryId: Id<any>, cfItemId?: string, isGroup?: boolean) => {
    setDeleteTarget({ type: entryType, entryId, cfItemId, isGroup }); setDeleteDialogOpen(true);
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
    } catch { toast.error("Failed to delete item"); } finally {
      setIsDeleting(false); setDeleteDialogOpen(false); setDeleteTarget(null);
    }
  };

  return (
    <>
      <div className="flex w-full flex-col gap-6">
        <header className="flex flex-col justify-between gap-4 border-b border-border pb-6 md:flex-row md:items-end">
          <div>
            <h1 className="m-0 text-2xl font-bold tracking-tight">{config.label}</h1>
            <p className="m-0 mt-1 text-sm text-muted-foreground">Add and manage knowledge sources for your agent.</p>
          </div>
          <Button onClick={() => navigate(`/dashboard/${agentId}/playground`)}>
            Test in playground
            <ArrowRight className="size-4" />
          </Button>
        </header>

        <div className="grid gap-6 lg:grid-cols-[3fr_2fr] xl:grid-cols-[7fr_3fr]">
          {/* LEFT: Type-specific section */}
          <div className="flex flex-col gap-6">
            {type === 'web' && <WebSection entries={webEntries} agentId={selectedAgentId} openDeleteDialog={openDeleteDialog} />}
            {type === 'file' && <FileSection entries={fileEntries} agentId={selectedAgentId} openDeleteDialog={openDeleteDialog} maxFileSize={maxFileSize} />}
            {type === 'text' && <TextSection entries={textEntries} agentId={selectedAgentId} openDeleteDialog={openDeleteDialog} />}
            {type === 'qa' && <QASection entries={qaEntries} agentId={selectedAgentId} openDeleteDialog={openDeleteDialog} />}
          </div>

          {/* RIGHT: Stats + File size limit */}
          <div className="flex flex-col gap-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <BookOpen className="size-4" />
              Knowledge Base
            </h2>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between rounded-lg border border-border bg-card px-5 py-4">
                <div className="flex items-center gap-3">
                  <Globe className="size-5 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">{webCount} web</span>
                </div>
                <span className="text-sm text-muted-foreground tabular-nums">{formatFileSize(webSize)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border bg-card px-5 py-4">
                <div className="flex items-center gap-3">
                  <FileText className="size-5 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">{fileCount} file</span>
                </div>
                <span className="text-sm text-muted-foreground tabular-nums">{formatFileSize(fileSizeVal)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border bg-card px-5 py-4">
                <div className="flex items-center gap-3">
                  <AlignLeft className="size-5 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">{textCount} text</span>
                </div>
                <span className="text-sm text-muted-foreground tabular-nums">{formatFileSize(textSize)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border bg-card px-5 py-4">
                <div className="flex items-center gap-3">
                  <HelpCircle className="size-5 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">{qaCount} Q&A</span>
                </div>
                <span className="text-sm text-muted-foreground tabular-nums">{formatFileSize(qaSize)}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-foreground" />
                <h2 className="text-sm font-semibold text-foreground">File size limit</h2>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Storage used</span>
                  <span>{formatFileSize(totalFileSize)} of {formatFileSize(maxTotalSize)}</span>
                </div>
                <Progress value={Math.min((totalFileSize / maxTotalSize) * 100, 100)} className="h-1" />
              </div>
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
              {deleteTarget?.isGroup
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
