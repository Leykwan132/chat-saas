import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { TextKnowledgeEditForm } from "./TextKnowledgeEditForm";

interface TextEntryDetailsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  content: string;
  canManage?: boolean;
  isSaving?: boolean;
  onTitleChange: (title: string) => void;
  onContentChange: (content: string) => void;
  onSave: () => void;
  onDelete: () => void;
}

export function TextKnowledgeContent({
  title,
  content,
  canManage = false,
  onTitleChange,
  onContentChange,
}: Pick<
  TextEntryDetailsProps,
  "title" | "content" | "canManage" | "onTitleChange" | "onContentChange"
>) {
  return (
    <>
      <DialogHeader className="border-b border-border px-6 py-5">
        <DialogTitle>Text knowledge</DialogTitle>
        <DialogDescription className="break-all">
          {canManage ? "Update this text knowledge entry." : title}
        </DialogDescription>
      </DialogHeader>
      {canManage ? (
        <TextKnowledgeEditForm
          title={title}
          content={content}
          onTitleChange={onTitleChange}
          onContentChange={onContentChange}
        />
      ) : (
        <div className="min-h-0 overflow-auto p-6">
          <p className="mb-3 text-sm font-medium">{title}</p>
          <pre className="whitespace-pre-wrap break-words text-xs leading-5">{content}</pre>
        </div>
      )}
    </>
  );
}

export function TextEntryDetails({
  open,
  onOpenChange,
  title,
  content,
  canManage = false,
  isSaving = false,
  onTitleChange,
  onContentChange,
  onSave,
  onDelete,
}: TextEntryDetailsProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={knowledgeBaseDialogContentClassName}>
        <TextKnowledgeContent
          title={title}
          content={content}
          canManage={canManage}
          onTitleChange={onTitleChange}
          onContentChange={onContentChange}
        />
        {canManage ? (
          <DialogFooter className="border-t border-border px-6 py-4">
            <Button type="button" variant="destructive" onClick={onDelete}>
              <Trash2 className="size-4 mr-1" />Delete
            </Button>
            <Button
              type="button"
              onClick={onSave}
              disabled={!title.trim() || !content.trim() || isSaving}
            >
              {isSaving ? <Spinner className="size-4" /> : "Update"}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
