import { useEffect, useState } from "react";
import { Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

interface WebEntryDetailsProps {
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

export function WebEntryDetails({
  url,
  fileSizeLabel,
  markdown,
  markdownUrl,
  isMarkdownLoading = false,
}: WebEntryDetailsProps) {
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
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
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-muted/50 px-4 py-3 space-y-1.5">
        <p className="text-sm break-all">{url}</p>
        <p className="text-xs text-muted-foreground tabular-nums">{fileSizeLabel}</p>
      </div>
      {displayedMarkdown !== undefined || isLoading ? (
        <div className="rounded-lg border border-border">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-medium">Scraped Markdown</h3>
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsFullscreenOpen(true)}>
              <Maximize2 />
              Open full screen
            </Button>
          </div>
          {displayedMarkdown !== undefined ? (
            <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap break-words p-4 text-xs leading-5">
              {displayedMarkdown}
            </pre>
          ) : <MarkdownSkeleton />}
        </div>
      ) : null}
      <Dialog open={isFullscreenOpen} onOpenChange={setIsFullscreenOpen}>
        <DialogContent className="!top-0 !left-0 grid !h-[100dvh] !w-screen !max-w-none !translate-x-0 !translate-y-0 grid-rows-[auto_1fr] !gap-0 !rounded-none !p-0">
          <DialogHeader className="border-b border-border px-6 py-5">
            <DialogTitle>Scraped Markdown</DialogTitle>
            <DialogDescription className="break-all">{url}</DialogDescription>
          </DialogHeader>
          {displayedMarkdown !== undefined ? (
            <pre className="min-h-0 overflow-auto whitespace-pre-wrap break-words p-6 text-xs leading-5">
              {displayedMarkdown}
            </pre>
          ) : <MarkdownSkeleton className="p-6" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
