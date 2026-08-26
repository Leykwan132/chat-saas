import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface WebEntryDetailsProps {
  url: string;
  fileSizeLabel: string;
  markdown?: string;
  markdownUrl?: string | null;
}

export function WebEntryDetails({
  url,
  fileSizeLabel,
  markdown,
  markdownUrl,
}: WebEntryDetailsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [downloadedMarkdown, setDownloadedMarkdown] = useState<string>();
  const displayedMarkdown = markdown ?? downloadedMarkdown;

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
      {displayedMarkdown !== undefined ? (
        <div className="rounded-lg border border-border">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-medium">Scraped Markdown</h3>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded((current) => !current)}
            >
              {isExpanded ? "Collapse markdown" : "View full markdown"}
            </Button>
          </div>
          <pre className={`overflow-auto whitespace-pre-wrap break-words p-4 text-xs leading-5 ${isExpanded ? "max-h-[60vh]" : "max-h-52"}`}>
            {displayedMarkdown}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
