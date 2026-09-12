import { useEffect, useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { knowledgeBaseDialogContentClassName } from "./knowledgeBaseDialog";

interface WebEntryDetailsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  fileSizeLabel: string;
  markdown?: string;
  markdownUrl?: string | null;
  isMarkdownLoading?: boolean;
  canManage?: boolean;
  canEdit?: boolean;
  isSaving?: boolean;
  onSave?: (markdown: string) => void;
  onDelete?: () => void;
}

function MarkdownSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`space-y-3 p-4 ${className}`}>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-11/12" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

interface ScrapedMarkdownContentProps {
  url: string;
  fileSizeLabel: string;
  markdown?: string;
  draft?: string;
  isMarkdownLoading?: boolean;
  canEdit?: boolean;
  onDraftChange?: (markdown: string) => void;
}

export function ScrapedMarkdownContent({
  url,
  fileSizeLabel,
  markdown,
  draft,
  isMarkdownLoading = false,
  canEdit = false,
  onDraftChange,
}: ScrapedMarkdownContentProps) {
  const value = draft ?? markdown;

  return (
    <>
      <DialogHeader className="border-b border-border px-6 py-5">
        <DialogTitle>Website knowledge</DialogTitle>
        <DialogDescription className="space-y-1 break-all">
          <span className="block">{url}</span>
          <span className="block tabular-nums">{fileSizeLabel}</span>
        </DialogDescription>
      </DialogHeader>
      {value !== undefined ? (
        canEdit && onDraftChange ? (
          <textarea
            value={value}
            onChange={(event) => onDraftChange(event.target.value)}
            className="min-h-0 w-full flex-1 resize-none bg-transparent px-6 py-6 text-xs leading-5 outline-none"
          />
        ) : (
          <pre className="min-h-0 overflow-auto whitespace-pre-wrap break-words p-6 text-xs leading-5">
            {value}
          </pre>
        )
      ) : isMarkdownLoading ? <MarkdownSkeleton className="p-6" /> : (
        <p className="p-6 text-sm text-muted-foreground">No scraped Markdown is available for this source.</p>
      )}
    </>
  );
}

export function WebEntryDetails({
  open,
  onOpenChange,
  url,
  fileSizeLabel,
  markdown,
  markdownUrl,
  isMarkdownLoading = false,
  canManage = false,
  canEdit = false,
  isSaving = false,
  onSave,
  onDelete,
}: WebEntryDetailsProps) {
  const [downloadedMarkdown, setDownloadedMarkdown] = useState<string>();
  const [draft, setDraft] = useState<string>();
  const displayedMarkdown = markdown ?? downloadedMarkdown;
  const isLoading = isMarkdownLoading || (
    markdownUrl !== undefined && markdownUrl !== null && displayedMarkdown === undefined
  );

  useEffect(() => {
    if (!markdownUrl || markdown !== undefined) return;
    const controller = new AbortController();
    void fetch(markdownUrl, { signal: controller.signal })
      .then((response) => response.text())
      .then((text) => {
        setDownloadedMarkdown(text);
        setDraft(text);
      });
    return () => controller.abort();
  }, [markdown, markdownUrl]);

  useEffect(() => {
    if (markdown !== undefined) setDraft(markdown);
  }, [markdown]);

  const currentMarkdown = draft ?? displayedMarkdown;
  const isDirty = displayedMarkdown !== undefined && currentMarkdown !== displayedMarkdown;
  const showFooter = canManage && (onDelete || (canEdit && onSave));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={knowledgeBaseDialogContentClassName}>
        <ScrapedMarkdownContent
          url={url}
          fileSizeLabel={fileSizeLabel}
          markdown={displayedMarkdown}
          draft={draft}
          isMarkdownLoading={isLoading}
          canEdit={canEdit}
          onDraftChange={setDraft}
        />
        {showFooter ? (
          <DialogFooter className="border-t border-border px-6 py-4">
            {onDelete ? (
              <Button type="button" variant="destructive" onClick={onDelete}>
                <Trash2 className="size-4 mr-1" />Delete
              </Button>
            ) : null}
            {canEdit && onSave ? (
              <Button
                type="button"
                onClick={() => {
                  if (!currentMarkdown?.trim()) return;
                  onSave(currentMarkdown);
                }}
                disabled={!isDirty || !currentMarkdown?.trim() || isSaving}
              >
                {isSaving ? <Spinner className="size-4" /> : "Update"}
              </Button>
            ) : null}
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
