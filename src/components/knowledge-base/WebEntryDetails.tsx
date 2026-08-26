import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

interface WebEntryDetailsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  fileSizeLabel: string;
  markdown?: string;
  markdownUrl?: string | null;
  isMarkdownLoading?: boolean;
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
  isMarkdownLoading?: boolean;
}

export function ScrapedMarkdownContent({
  url,
  fileSizeLabel,
  markdown,
  isMarkdownLoading = false,
}: ScrapedMarkdownContentProps) {
  return (
    <>
      <DialogHeader className="border-b border-border px-6 py-5">
        <DialogTitle>Scraped Markdown</DialogTitle>
        <DialogDescription className="space-y-1 break-all">
          <span className="block">{url}</span>
          <span className="block tabular-nums">{fileSizeLabel}</span>
        </DialogDescription>
      </DialogHeader>
      {markdown !== undefined ? (
        <pre className="min-h-0 overflow-auto whitespace-pre-wrap break-words p-6 text-xs leading-5">
          {markdown}
        </pre>
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
}: WebEntryDetailsProps) {
  const [downloadedMarkdown, setDownloadedMarkdown] = useState<string>();
  const displayedMarkdown = markdown ?? downloadedMarkdown;
  const isLoading = isMarkdownLoading || (
    markdownUrl !== undefined && markdownUrl !== null && displayedMarkdown === undefined
  );

  useEffect(() => {
    if (!markdownUrl || markdown !== undefined) return;
    const controller = new AbortController();
    void fetch(markdownUrl, { signal: controller.signal })
      .then((response) => response.text())
      .then(setDownloadedMarkdown);
    return () => controller.abort();
  }, [markdown, markdownUrl]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!top-4 !left-4 grid !h-[calc(100dvh-2rem)] !w-[calc(100vw-2rem)] !max-w-none !translate-x-0 !translate-y-0 grid-rows-[auto_1fr] !gap-0 overflow-hidden !rounded-3xl !p-0 lg:!top-6 lg:!left-6 lg:!h-[calc(100dvh-3rem)] lg:!w-[calc(100vw-3rem)]">
        <ScrapedMarkdownContent
          url={url}
          fileSizeLabel={fileSizeLabel}
          markdown={displayedMarkdown}
          isMarkdownLoading={isLoading}
        />
      </DialogContent>
    </Dialog>
  );
}
