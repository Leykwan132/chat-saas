import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { knowledgeBaseDialogContentClassName } from "./knowledgeBaseDialog";

interface QAEntryDetailsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question: string;
  answer: string;
  canManage?: boolean;
  isSaving?: boolean;
  onQuestionChange: (question: string) => void;
  onAnswerChange: (answer: string) => void;
  onSave: () => void;
  onDelete: () => void;
}

export function QAKnowledgeContent({
  question,
  answer,
  canManage = false,
  onQuestionChange,
  onAnswerChange,
}: Pick<
  QAEntryDetailsProps,
  "question" | "answer" | "canManage" | "onQuestionChange" | "onAnswerChange"
>) {
  return (
    <>
      <DialogHeader className="border-b border-border px-6 py-5">
        <DialogTitle>Q&A knowledge</DialogTitle>
        <DialogDescription>
          {canManage ? "Update this Q&A entry." : question}
        </DialogDescription>
      </DialogHeader>
      {canManage ? (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-4">
          <Input
            value={question}
            onChange={(event) => onQuestionChange(event.target.value)}
            placeholder="Enter question"
          />
          <Textarea
            value={answer}
            onChange={(event) => onAnswerChange(event.target.value)}
            placeholder="Enter answer"
            className="min-h-0 flex-1 overflow-auto border-border bg-background"
          />
        </div>
      ) : (
        <div className="min-h-0 overflow-auto p-6">
          <p className="mb-3 text-sm font-medium">Q: {question}</p>
          <pre className="whitespace-pre-wrap break-words text-xs leading-5">{answer}</pre>
        </div>
      )}
    </>
  );
}

export function QAEntryDetails({
  open,
  onOpenChange,
  question,
  answer,
  canManage = false,
  isSaving = false,
  onQuestionChange,
  onAnswerChange,
  onSave,
  onDelete,
}: QAEntryDetailsProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={knowledgeBaseDialogContentClassName}>
        <QAKnowledgeContent
          question={question}
          answer={answer}
          canManage={canManage}
          onQuestionChange={onQuestionChange}
          onAnswerChange={onAnswerChange}
        />
        {canManage ? (
          <DialogFooter className="border-t border-border px-6 py-4">
            <Button type="button" variant="destructive" onClick={onDelete}>
              <Trash2 className="size-4 mr-1" />Delete
            </Button>
            <Button
              type="button"
              onClick={onSave}
              disabled={!question.trim() || !answer.trim() || isSaving}
            >
              {isSaving ? <Spinner className="size-4" /> : "Update"}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
