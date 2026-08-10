import { X } from 'lucide-react';
import type { Id } from '../../../convex/_generated/dataModel';

// ─── Formatters ────────────────────────────────────────────

export function formatFileSize(bytes: number): string {
  const kb = bytes / 1024;
  if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB`;
  return `${kb.toFixed(1)} KB`;
}

export function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** react-drag-drop-files passes a FileList (not File[]) when multiple is enabled. */
export function normalizeUploaderFiles(
  fileOrFiles: File | FileList | File[],
): File[] {
  if (fileOrFiles instanceof File) return [fileOrFiles];
  return Array.from(fileOrFiles);
}

// ─── Status helpers ────────────────────────────────────────

export function StatusBadge({ status }: { status?: string }) {
  if (!status || status === "completed") return null;
  switch (status) {
    case "failed":
      return <span className="inline-flex items-center gap-1 text-xs text-red-500 shrink-0 ml-2"><X className="size-3" />Failed</span>;
    default:
      return null;
  }
}

export function isInProgress(status?: string) {
  return status === "gettingLinks" || status === "linksObtained" || status === "gettingMarkdown" ||
    status === "queued" || status === "processing" || status === "deleting";
}

export function isTraining(status?: string) {
  return isInProgress(status) && status !== "deleting";
}

export function isKbImageInProgress(status?: string) {
  return status === "queued" || status === "uploading" || status === "deleting";
}

export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch { return false; }
}

// ─── Types ─────────────────────────────────────────────────

export type OpenDeleteDialog = (
  entryType: 'web' | 'file' | 'text' | 'qa' | 'media',
  entryId: Id<any> | string,
  cfItemId?: string,
  isGroup?: boolean,
) => void;

export function KnowledgeBaseEmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center">
      <p className="text-sm text-muted-foreground">There are no sources yet.</p>
    </div>
  );
}
