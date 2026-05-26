import { useState } from 'react';
import { useAction } from 'convex/react';
import {
  Trash2,
  Check,
  Plus,
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

interface QASectionProps {
  entries: any[] | undefined;
  agentId: Id<'agents'> | undefined;
  openDeleteDialog: OpenDeleteDialog;
  canManage?: boolean;
}

export function QASection({ entries, agentId, openDeleteDialog, canManage = true }: QASectionProps) {
  const enqueueQAUpload = useAction(api.cloudflare.enqueueQAUpload);
  const updateQAEntry = useAction(api.cloudflare.updateQAEntry);

  const [qaPairs, setQAPairs] = useState<{ question: string; answer: string }[]>([{ question: "", answer: "" }]);
  const [isSavingQA, setIsSavingQA] = useState(false);

  const [editingQAEntry, setEditingQAEntry] = useState<any | null>(null);
  const [editQAPairs, setEditQAPairs] = useState<{ question: string; answer: string }[]>([{ question: "", answer: "" }]);

  const handleSaveQA = async () => {
    if (!agentId) return;
    const validPairs = qaPairs.filter((p) => p.question.trim() && p.answer.trim());
    if (validPairs.length === 0) return;
    setIsSavingQA(true);
    toast.success(`${validPairs.length} Q&A pair${validPairs.length > 1 ? "s" : ""} queued for processing`);
    try {
      for (const pair of validPairs) await enqueueQAUpload({ agentId, question: pair.question.trim(), answer: pair.answer.trim() });
      setQAPairs([{ question: "", answer: "" }]);
    } catch { toast.error("Failed to save Q&A entry"); } finally { setIsSavingQA(false); }
  };

  const addQAPair = () => setQAPairs((prev) => [...prev, { question: "", answer: "" }]);
  const updateQAPair = (index: number, field: "question" | "answer", value: string) => {
    setQAPairs((prev) => prev.map((pair, i) => (i === index ? { ...pair, [field]: value } : pair)));
  };
  const removeQAPair = (index: number) => setQAPairs((prev) => prev.filter((_, i) => i !== index));

  const openEditQA = (entry: any) => {
    setEditingQAEntry(entry); setEditQAPairs([{ question: entry.question, answer: entry.answer }]);
  };

  const updateEditQAPair = (index: number, field: "question" | "answer", value: string) => {
    setEditQAPairs((prev) => prev.map((pair, i) => (i === index ? { ...pair, [field]: value } : pair)));
  };
  const removeEditQAPair = (index: number) => setEditQAPairs((prev) => prev.filter((_, i) => i !== index));

  const handleUpdateQA = async () => {
    if (!editingQAEntry) return;
    const pair = editQAPairs[0];
    if (!pair.question.trim() || !pair.answer.trim()) return;
    setIsSavingQA(true);
    try {
      await updateQAEntry({ entryId: editingQAEntry._id, question: pair.question.trim(), answer: pair.answer.trim(), cfItemId: editingQAEntry.cfItemId ?? undefined });
      toast.success("Q&A pair updated"); setEditingQAEntry(null);
    } catch { toast.error("Failed to update Q&A entry"); } finally { setIsSavingQA(false); }
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
        <h2 className="text-sm font-semibold text-foreground mb-3">Add Q&A</h2>
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="space-y-3">
            {qaPairs.map((pair, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Q&A {index + 1}</span>
                  {qaPairs.length > 1 && (
                    <button type="button" onClick={() => removeQAPair(index)} className="rounded p-1 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="size-3" /></button>
                  )}
                </div>
                <Input value={pair.question} onChange={(e) => updateQAPair(index, "question", e.target.value)} placeholder="Enter question" />
                <textarea value={pair.answer} onChange={(e) => updateQAPair(index, "answer", e.target.value)} rows={3} placeholder="Enter answer" className="min-h-12 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm leading-5 outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30" />
              </div>
            ))}
          </div>
          <div className="flex justify-between">
            <Button type="button" variant="outline" size="sm" onClick={addQAPair}><Plus className="size-3 mr-1" />Add more</Button>
            <Button type="button" onClick={handleSaveQA} disabled={isSavingQA || !qaPairs.some((p) => p.question.trim() && p.answer.trim())}>{isSavingQA ? <Spinner className="size-4" /> : "Save"}</Button>
          </div>
        </div>
      </div>
      ) : null}

      {hasEntries && (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">{canManage ? 'Your Q&A' : 'Sources'}</h2>
          <div className="space-y-2">
            {inProgressEntries.map((entry: any) => (
              <div key={entry._id} onClick={canManage ? () => openEditQA(entry) : undefined} className={`group flex items-center justify-between rounded-md bg-muted px-4 py-3 ${canManage ? 'cursor-pointer hover:bg-muted/80' : ''} transition-colors`}>
                <div className="flex items-center gap-3 min-w-0">
                  <Spinner className="size-4 shrink-0 text-yellow-500" />
                  <span className={`text-sm truncate ${entry.status === "deleting" ? "line-through opacity-50" : ""}`}>Q: {entry.question}</span>
                  <StatusBadge status={entry.status} />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {entry.fileSize > 0 && <span className="text-xs text-muted-foreground tabular-nums min-w-[4.5rem] text-right">{formatFileSize(entry.fileSize)}</span>}
                  {canManage ? (
                  <button type="button" onClick={(e) => { e.stopPropagation(); openDeleteDialog('qa', entry._id, entry.cfItemId); }} className="rounded p-1 text-muted-foreground hover:bg-background hover:text-destructive transition-colors"><Trash2 className="size-3.5" /></button>
                  ) : null}
                </div>
              </div>
            ))}
            {completedEntries.map((entry: any) => (
              <div key={entry._id} onClick={canManage ? () => openEditQA(entry) : undefined} className={`group flex items-center justify-between rounded-md bg-muted px-4 py-3 ${canManage ? 'cursor-pointer hover:bg-muted/80' : ''} transition-colors`}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-600"><Check className="size-2.5 text-white" /></div>
                  <span className="text-sm truncate">Q: {entry.question}</span>
                  <StatusBadge status={entry.status} />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground tabular-nums min-w-[4.5rem] text-right">{formatFileSize(entry.fileSize)}</span>
                  {canManage ? (
                  <button type="button" onClick={(e) => { e.stopPropagation(); openDeleteDialog('qa', entry._id, entry.cfItemId); }} className="rounded p-1 text-muted-foreground hover:bg-background hover:text-destructive transition-colors"><Trash2 className="size-3.5" /></button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {canManage && editingQAEntry !== null ? (
      <Sheet open={editingQAEntry !== null} onOpenChange={(open) => { if (!open) setEditingQAEntry(null); }}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Edit Q&A Pair</SheetTitle>
            <SheetDescription>Update this Q&A entry.</SheetDescription>
          </SheetHeader>
          <div className="flex-1 px-6 py-4 space-y-4 overflow-y-auto">
            {editQAPairs.map((pair, index) => (
              <div key={index} className="space-y-2 rounded-lg border border-border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Pair {index + 1}</span>
                  {editQAPairs.length > 1 && (
                    <button type="button" onClick={() => removeEditQAPair(index)} className="rounded p-1 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="size-3" /></button>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Input value={pair.question} onChange={(e) => updateEditQAPair(index, "question", e.target.value)} placeholder="Enter question" />
                  <textarea value={pair.answer} onChange={(e) => updateEditQAPair(index, "answer", e.target.value)} rows={3} placeholder="Enter answer" className="min-h-12 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm leading-5 outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30" />
                </div>
              </div>
            ))}
          </div>
          <SheetFooter className="flex flex-row justify-end gap-2">
            {editingQAEntry && (
              <Button type="button" variant="destructive" onClick={() => { setEditingQAEntry(null); openDeleteDialog('qa', editingQAEntry._id, editingQAEntry.cfItemId); }}><Trash2 className="size-4 mr-1" />Delete</Button>
            )}
            <Button type="button" onClick={handleUpdateQA} disabled={isSavingQA || !editQAPairs.some((p) => p.question.trim() && p.answer.trim())}>{isSavingQA ? <Spinner className="size-4" /> : "Update"}</Button>
            <SheetClose asChild><Button variant="outline">Cancel</Button></SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      ) : null}
    </>
  );
}
