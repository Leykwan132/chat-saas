import { useState } from 'react';
import { useAction } from 'convex/react';
import {
  Upload,
  Trash2,
  Check,
} from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { toast } from "sonner";
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { FileUploader } from "react-drag-drop-files";
import {
  formatFileSize,
  normalizeUploaderFiles,
  StatusBadge,
  isInProgress,
  KnowledgeBaseEmptyState,
  type OpenDeleteDialog,
} from './helpers';

interface FileSectionProps {
  entries: any[] | undefined;
  agentId: Id<'agents'> | undefined;
  openDeleteDialog: OpenDeleteDialog;
  maxFileSize: number;
  canManage?: boolean;
}

export function FileSection({ entries, agentId, openDeleteDialog, maxFileSize, canManage = true }: FileSectionProps) {
  const enqueueFileUpload = useAction(api.cloudflare.enqueueFileUpload);

  const [, setIsSavingFile] = useState(false);
  const [editingFileEntry, setEditingFileEntry] = useState<any | null>(null);

  const handleSaveFile = async (files: File[]) => {
    if (!agentId || files.length === 0) return;
    toast.success(`${files.length} file${files.length > 1 ? "s" : ""} queued for processing`);
    setIsSavingFile(true);
    try {
      for (const file of files) {
        const fileBytes = await file.arrayBuffer();
        await enqueueFileUpload({ agentId, fileName: file.name, fileBytes });
      }
    } catch { toast.error("Failed to save files"); } finally { setIsSavingFile(false); }
  };

  const visibleEntries = (entries ?? []).filter(e => e.status !== "deleting");
  const inProgressEntries = visibleEntries.filter(e => isInProgress(e.status));
  const completedEntries = visibleEntries.filter(e => !isInProgress(e.status));
  const hasEntries = (entries ?? []).length > 0;

  if (!canManage && !hasEntries) {
    return <KnowledgeBaseEmptyState />;
  }

  return (
    <>
      {canManage ? (
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Add Files</h2>
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <FileUploader
            handleChange={(fileOrFiles) => {
              void handleSaveFile(normalizeUploaderFiles(fileOrFiles));
            }}
            onSizeError={(fileName: string) => {
              toast.error(`${fileName} exceeds the ${formatFileSize(maxFileSize)} limit`);
            }}
            onTypeError={(fileName: string) => {
              toast.error(`${fileName} is not supported file`);
            }}
            multiple
            maxSize={maxFileSize}
            types={["txt", "doc", "docx", "csv", "json"]}
          >
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-6 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer">
              <Upload className="size-8 text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-foreground">Drag & drop files here</p>
              <p className="text-xs text-muted-foreground mt-1">or click to browse (max {formatFileSize(maxFileSize)} each)</p>
            </div>
          </FileUploader>
        </div>
      </div>
      ) : null}

      {hasEntries && (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">{canManage ? 'Your files' : 'Sources'}</h2>
          <div className="space-y-2">
            {inProgressEntries.map((entry: any) => (
              <div key={entry._id} onClick={canManage ? () => setEditingFileEntry(entry) : undefined} className={`group flex items-center justify-between rounded-md bg-muted px-4 py-3 ${canManage ? 'cursor-pointer hover:bg-muted/80' : ''} transition-colors`}>
                <div className="flex items-center gap-3 min-w-0">
                  <Spinner className="size-4 shrink-0 text-yellow-500" />
                  <span className="text-sm truncate">{entry.fileName}</span>
                  <StatusBadge status={entry.status} />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {entry.fileSize > 0 && <span className="text-xs text-muted-foreground tabular-nums min-w-[4.5rem] text-right">{formatFileSize(entry.fileSize)}</span>}
                  {canManage ? (
                  <button type="button" onClick={(e) => { e.stopPropagation(); openDeleteDialog('file', entry._id, entry.cfItemId); }} className="rounded p-1 text-muted-foreground hover:bg-background hover:text-destructive transition-colors"><Trash2 className="size-3.5" /></button>
                  ) : null}
                </div>
              </div>
            ))}
            {completedEntries.map((entry: any) => (
              <div key={entry._id} onClick={canManage ? () => setEditingFileEntry(entry) : undefined} className={`group flex items-center justify-between rounded-md bg-muted px-4 py-3 ${canManage ? 'cursor-pointer hover:bg-muted/80' : ''} transition-colors`}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-600"><Check className="size-2.5 text-white" /></div>
                  <span className="text-sm truncate">{entry.fileName}</span>
                  <StatusBadge status={entry.status} />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground tabular-nums min-w-[4.5rem] text-right">{formatFileSize(entry.fileSize)}</span>
                  {canManage ? (
                  <button type="button" onClick={(e) => { e.stopPropagation(); openDeleteDialog('file', entry._id, entry.cfItemId); }} className="rounded p-1 text-muted-foreground hover:bg-background hover:text-destructive transition-colors"><Trash2 className="size-3.5" /></button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {canManage && editingFileEntry !== null ? (
      <Sheet open={editingFileEntry !== null} onOpenChange={(open) => { if (!open) setEditingFileEntry(null); }}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>File Details</SheetTitle>
            <SheetDescription>View file details.</SheetDescription>
          </SheetHeader>
          <div className="flex-1 px-6 py-4 space-y-4">
            {editingFileEntry && (
              <div className="rounded-lg border border-border bg-muted/50 px-4 py-3 space-y-1.5">
                <p className="text-sm font-medium">{editingFileEntry.fileName}</p>
                <p className="text-xs text-muted-foreground tabular-nums">{formatFileSize(editingFileEntry.fileSize)}</p>
              </div>
            )}
          </div>
          <SheetFooter className="flex flex-row justify-end gap-2">
            {editingFileEntry && (
              <Button type="button" variant="destructive" onClick={() => { setEditingFileEntry(null); openDeleteDialog('file', editingFileEntry._id, editingFileEntry.cfItemId); }}><Trash2 className="size-4 mr-1" />Delete</Button>
            )}
            <SheetClose asChild><Button variant="outline">Cancel</Button></SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      ) : null}
    </>
  );
}
