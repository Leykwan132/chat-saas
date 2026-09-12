import { useState } from 'react';
import { useMutation } from 'convex/react';
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
import { Textarea } from '@/components/ui/textarea';

import {
  formatFileSize,
  StatusBadge,
  isInProgress,
  KnowledgeBaseEmptyState,
  type OpenDeleteDialog,
} from './helpers';
import { QAEntry } from './QAEntry';
import { QAEntryDetails } from './QAEntryDetails';
import { addQAPreset, qaQuestionPresets, type QAPairDraft } from './qaQuestionPresets';

interface QASectionProps {
  entries: any[] | undefined;
  agentId: Id<'agents'> | undefined;
  openDeleteDialog: OpenDeleteDialog;
  canManage?: boolean;
}

export function QASection({ entries, agentId, openDeleteDialog, canManage = true }: QASectionProps) {
  const addQAEntry = useMutation(api.knowledgeBase.addQAEntry);
  const updateQAEntry = useMutation(api.knowledgeBase.updateQAEntry);

  const [qaPairs, setQAPairs] = useState<QAPairDraft[]>([{ question: "", answer: "" }]);
  const [isSavingQA, setIsSavingQA] = useState(false);

  const [editingQAEntry, setEditingQAEntry] = useState<any | null>(null);
  const [editQuestion, setEditQuestion] = useState("");
  const [editAnswer, setEditAnswer] = useState("");

  const handleSaveQA = async () => {
    if (!agentId) return;
    const validPairs = qaPairs.filter((p) => p.question.trim() && p.answer.trim());
    if (validPairs.length === 0) return;
    setIsSavingQA(true);
    try {
      for (const pair of validPairs) await addQAEntry({ agentId, question: pair.question.trim(), answer: pair.answer.trim() });
      setQAPairs([{ question: "", answer: "" }]);
      toast.success(`${validPairs.length} Q&A pair${validPairs.length > 1 ? "s" : ""} saved`);
    } catch { toast.error("Failed to save Q&A entry"); } finally { setIsSavingQA(false); }
  };

  const selectQAPreset = (question: string) => {
    setQAPairs((pairs) => addQAPreset(pairs, question));
  };

  const updateQAPair = (index: number, field: "question" | "answer", value: string) => {
    setQAPairs((prev) => prev.map((pair, i) => (i === index ? { ...pair, [field]: value } : pair)));
  };
  const removeQAPair = (index: number) => setQAPairs((prev) => prev.filter((_, i) => i !== index));

  const openEditQA = (entry: any) => {
    setEditingQAEntry(entry);
    setEditQuestion(entry.question);
    setEditAnswer(entry.answer);
  };

  const handleUpdateQA = async () => {
    if (!editingQAEntry || !editQuestion.trim() || !editAnswer.trim()) return;
    setIsSavingQA(true);
    try {
      await updateQAEntry({ entryId: editingQAEntry._id, question: editQuestion.trim(), answer: editAnswer.trim() });
      toast.success("Q&A pair is updating"); setEditingQAEntry(null);
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
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {qaQuestionPresets.map((preset) => (
            <Button
              key={preset.label}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => selectQAPreset(preset.question)}
            >
              {preset.label}
            </Button>
          ))}
        </div>
        <QAEntry>
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
                <Textarea
                  value={pair.answer}
                  onChange={(e) => updateQAPair(index, "answer", e.target.value)}
                  placeholder="Enter answer"
                  className="overflow-hidden border-border bg-background"
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <Button type="button" onClick={handleSaveQA} disabled={isSavingQA || !qaPairs.some((p) => p.question.trim() && p.answer.trim())}>{isSavingQA ? <Spinner className="size-4" /> : "Save"}</Button>
          </div>
        </QAEntry>
      </div>
      ) : null}

      {hasEntries && (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">{canManage ? 'Your Q&A' : 'Sources'}</h2>
          <div className="space-y-2">
            {inProgressEntries.map((entry: any) => (
              <div key={entry._id} onClick={() => openEditQA(entry)} className="group flex items-center justify-between rounded-md bg-muted px-4 py-3 cursor-pointer hover:bg-muted/80 transition-colors">
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
              <div key={entry._id} onClick={() => openEditQA(entry)} className="group flex items-center justify-between rounded-md bg-muted px-4 py-3 cursor-pointer hover:bg-muted/80 transition-colors">
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

      {editingQAEntry !== null ? (
        <QAEntryDetails
          key={editingQAEntry._id}
          open={true}
          onOpenChange={(open) => { if (!open) setEditingQAEntry(null); }}
          question={editQuestion}
          answer={editAnswer}
          canManage={canManage}
          isSaving={isSavingQA}
          onQuestionChange={setEditQuestion}
          onAnswerChange={setEditAnswer}
          onSave={handleUpdateQA}
          onDelete={() => {
            setEditingQAEntry(null);
            openDeleteDialog('qa', editingQAEntry._id, editingQAEntry.cfItemId);
          }}
        />
      ) : null}
    </>
  );
}
