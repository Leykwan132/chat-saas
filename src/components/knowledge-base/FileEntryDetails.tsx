import { filePreviewKind } from "@/lib/knowledgeBaseFileText";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { knowledgeBaseDialogContentClassName } from "./knowledgeBaseDialog";

interface FilePreviewContentProps {
  fileName: string;
  fileSizeLabel: string;
  extractedText?: string | null;
  previewUrl?: string | null;
  isPreviewLoading?: boolean;
}

interface FileEntryDetailsProps extends FilePreviewContentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function PreviewSkeleton() {
  return (
    <div className="space-y-3 p-6">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-11/12" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

export function FilePreviewContent({
  fileName,
  fileSizeLabel,
  extractedText,
  previewUrl,
  isPreviewLoading = false,
}: FilePreviewContentProps) {
  const kind = filePreviewKind(fileName);
  const text = extractedText?.trim() || undefined;
  const hasVisual = Boolean(previewUrl) && (kind === "image" || kind === "pdf");
  const hasPreview = hasVisual || Boolean(text);

  return (
    <>
      <DialogHeader className="border-b border-border px-6 py-5">
        <DialogTitle>File preview</DialogTitle>
        <DialogDescription className="space-y-1 break-all">
          <span className="block">{fileName}</span>
          <span className="block tabular-nums">{fileSizeLabel}</span>
        </DialogDescription>
      </DialogHeader>
      {isPreviewLoading ? (
        <PreviewSkeleton />
      ) : hasPreview ? (
        <div className="min-h-0 overflow-auto">
          {kind === "image" && previewUrl ? (
            <img src={previewUrl} alt={fileName} className="mx-auto max-h-[70dvh] max-w-full object-contain p-6" />
          ) : null}
          {kind === "pdf" && previewUrl ? (
            <iframe title={fileName} src={previewUrl} className="h-[70dvh] w-full border-0" />
          ) : null}
          {text ? (
            <pre className="whitespace-pre-wrap break-words p-6 text-xs leading-5">{text}</pre>
          ) : null}
        </div>
      ) : (
        <p className="p-6 text-sm text-muted-foreground">No preview is available for this file.</p>
      )}
    </>
  );
}

export function FileEntryDetails({
  open,
  onOpenChange,
  ...preview
}: FileEntryDetailsProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={knowledgeBaseDialogContentClassName}>
        <FilePreviewContent {...preview} />
      </DialogContent>
    </Dialog>
  );
}
