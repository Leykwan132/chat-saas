import { useState } from 'react';
import { useAction } from 'convex/react';
import {
  Trash2,
  Check,
} from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { toast } from "sonner";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

import {
  formatFileSize,
  StatusBadge,
  isInProgress,
  KnowledgeBaseEmptyState,
  type OpenDeleteDialog,
} from './helpers';

interface TextSectionProps {
  entries: any[] | undefined;
  agentId: Id<'agents'> | undefined;
  openDeleteDialog: OpenDeleteDialog;
  canManage?: boolean;
}

export function TextSection({ entries, agentId, openDeleteDialog, canManage = true }: TextSectionProps) {
  const enqueueTextUpload = useAction(api.cloudflare.enqueueTextUpload);
  const updateTextEntry = useAction(api.cloudflare.updateTextEntry);

  const [textTitle, setTextTitle] = useState("");
  const [textContent, setTextContent] = useState("");
  const [isSavingText, setIsSavingText] = useState(false);

  const [editingTextEntry, setEditingTextEntry] = useState<any | null>(null);
  const [editTextTitle, setEditTextTitle] = useState("");
  const [editTextContent, setEditTextContent] = useState("");

  const handleSaveText = async () => {
    if (!agentId || !textTitle.trim() || !textContent.trim()) return;
    setIsSavingText(true);
    try {
      await enqueueTextUpload({ agentId, title: textTitle.trim(), content: textContent.trim() });
      toast.success("Text is now being processed");
      setTextTitle(""); setTextContent("");
    } catch { toast.error("Failed to save text entry"); } finally { setIsSavingText(false); }
  };

  const openEditText = (entry: any) => {
    setEditingTextEntry(entry); setEditTextTitle(entry.title); setEditTextContent(entry.content);
  };

  const handleUpdateText = async () => {
    if (!editingTextEntry || !editTextTitle.trim() || !editTextContent.trim()) return;
    setIsSavingText(true);
    try {
      await updateTextEntry({ entryId: editingTextEntry._id, title: editTextTitle.trim(), content: editTextContent.trim(), cfItemId: editingTextEntry.cfItemId ?? undefined });
      toast.success("Text entry updated"); setEditingTextEntry(null);
    } catch { toast.error("Failed to update text entry"); } finally { setIsSavingText(false); }
  };

  const inProgressEntries = (entries ?? []).filter(e => isInProgress(e.status));
  const completedEntries = (entries ?? []).filter(e => !isInProgress(e.status));
  const hasEntries = (entries ?? []).length > 0;

  if (!canManage && !hasEntries) {
    return <KnowledgeBaseEmptyState />;
  }

  return (
    <>
      {canManage ? (
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Add Text</h2>
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="flex flex-col gap-2">
            <Input value={textTitle} onChange={(e) => setTextTitle(e.target.value)} placeholder="Knowledge title" />
          </div>
          <textarea value={textContent} onChange={(e) => setTextContent(e.target.value)} rows={5} placeholder="Enter text knowledge here..." className="min-h-12 w-full resize-none rounded-lg border border-border bg-background px-3 py-3 text-sm leading-6 outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/30" />
          <div className="flex justify-end">
            <Button type="button" onClick={handleSaveText} disabled={!textTitle.trim() || !textContent.trim() || isSavingText}>{isSavingText ? <Spinner className="size-4" /> : "Save"}</Button>
          </div>
        </div>
      </div>
      ) : null}

      {hasEntries && (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">{canManage ? 'Your text' : 'Sources'}</h2>
          <div className="space-y-2">
            {inProgressEntries.map((entry: any) => (
              <div key={entry._id} onClick={canManage ? () => openEditText(entry) : undefined} className={`group flex items-center justify-between rounded-md bg-muted px-4 py-3 ${canManage ? 'cursor-pointer hover:bg-muted/80' : ''} transition-colors`}>
                <div className="flex items-center gap-3 min-w-0">
                  <Spinner className="size-4 shrink-0 text-yellow-500" />
                  <span className={`text-sm truncate ${entry.status === "deleting" ? "line-through opacity-50" : ""}`}>{entry.title}</span>
                  <StatusBadge status={entry.status} />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {entry.fileSize > 0 && <span className="text-xs text-muted-foreground tabular-nums min-w-[4.5rem] text-right">{formatFileSize(entry.fileSize)}</span>}
                  {canManage ? (
                  <button type="button" onClick={(e) => { e.stopPropagation(); openDeleteDialog('text', entry._id, entry.cfItemId); }} className="rounded p-1 text-muted-foreground hover:bg-background hover:text-destructive transition-colors"><Trash2 className="size-3.5" /></button>
                  ) : null}
                </div>
              </div>
            ))}
            {completedEntries.map((entry: any) => (
              <div key={entry._id} onClick={canManage ? () => openEditText(entry) : undefined} className={`group flex items-center justify-between rounded-md bg-muted px-4 py-3 ${canManage ? 'cursor-pointer hover:bg-muted/80' : ''} transition-colors`}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-600"><Check className="size-2.5 text-white" /></div>
                  <span className="text-sm truncate">{entry.title}</span>
                  <StatusBadge status={entry.status} />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground tabular-nums min-w-[4.5rem] text-right">{formatFileSize(entry.fileSize)}</span>
                  {canManage ? (
                  <button type="button" onClick={(e) => { e.stopPropagation(); openDeleteDialog('text', entry._id, entry.cfItemId); }} className="rounded p-1 text-muted-foreground hover:bg-background hover:text-destructive transition-colors"><Trash2 className="size-3.5" /></button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {canManage && editingTextEntry !== null ? (
      <Sheet open={editingTextEntry !== null} onOpenChange={(open) => { if (!open) setEditingTextEntry(null); }}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Edit Text Knowledge</SheetTitle>
            <SheetDescription>Update this text knowledge entry.</SheetDescription>
          </SheetHeader>
          <div className="flex-1 px-6 py-4 space-y-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-muted-foreground">Title</label>
              <Input value={editTextTitle} onChange={(e) => setEditTextTitle(e.target.value)} placeholder="Knowledge title" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-muted-foreground">Content</label>
              <textarea value={editTextContent} onChange={(e) => setEditTextContent(e.target.value)} rows={8} placeholder="Enter text knowledge here..." className="min-h-32 w-full resize-none rounded-lg border border-border bg-background px-3 py-3 text-sm leading-6 outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/30" />
            </div>
          </div>
          <SheetFooter className="flex flex-row justify-end gap-2">
            <Button type="button" variant="destructive" onClick={() => { setEditingTextEntry(null); if (editingTextEntry) openDeleteDialog('text', editingTextEntry._id, editingTextEntry.cfItemId); }}><Trash2 className="size-4 mr-1" />Delete</Button>
            <Button type="button" onClick={handleUpdateText} disabled={!editTextTitle.trim() || !editTextContent.trim() || isSavingText}>{isSavingText ? <Spinner className="size-4" /> : "Update"}</Button>
            <SheetClose asChild><Button variant="outline">Cancel</Button></SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      ) : null}
    </>
  );
}
