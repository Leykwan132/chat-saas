import { useEffect, useMemo, useState } from 'react';
import { useAction, useQuery } from 'convex/react';
import {
  Image as ImageIcon,
  Upload,
  Trash2,
  Check,
  ChevronDown,
  Info,
  X,
  FileText,
} from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { toast } from "sonner";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { FileUploader } from "react-drag-drop-files";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getPublicMediaUrl } from '@/lib/mediaUrl';
import {
  formatFileSize,
  normalizeUploaderFiles,
  StatusBadge,
  isKbImageInProgress,
  KnowledgeBaseEmptyState,
  type OpenDeleteDialog,
} from './helpers';

interface ImageSectionProps {
  agentId: Id<'agents'> | undefined;
  openDeleteDialog: OpenDeleteDialog;
  maxFileSize: number;
  type: 'media';
  canManage?: boolean;
}

type PendingImage = {
  id: string;
  file: File;
  previewUrl: string;
};

function imagePreviewUrl(entry: {
  publicUrl?: string;
  r2Key?: string;
  status?: string;
}): string | null {
  if (entry.publicUrl) return entry.publicUrl;
  if (entry.r2Key && entry.status === "ready") {
    try {
      return getPublicMediaUrl(entry.r2Key);
    } catch {
      return null;
    }
  }
  return null;
}

function revokePendingPreviews(items: PendingImage[]) {
  for (const item of items) {
    URL.revokeObjectURL(item.previewUrl);
  }
}

export function ImageSection({ agentId, openDeleteDialog, maxFileSize, canManage = true }: ImageSectionProps) {
  const entries = useQuery(
    api.knowledgeBaseImages.listKbImagesByAgent,
    agentId ? { agentId } : "skip",
  );
  const enqueueImageUpload = useAction(api.knowledgeBaseImages.enqueueImageUpload);

  const [collectionName, setCollectionName] = useState("");
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    return () => revokePendingPreviews(pendingImages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddImages = (files: File[]) => {
    if (files.length === 0) return;
    setPendingImages((prev) => [
      ...prev,
      ...files.map((file) => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
      })),
    ]);
  };

  const handleRemovePending = (id: string) => {
    setPendingImages((prev) => {
      const item = prev.find((p) => p.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  };

  const handleClearPending = () => {
    setPendingImages((prev) => {
      revokePendingPreviews(prev);
      return [];
    });
  };

  const handleSubmit = async () => {
    if (!agentId || pendingImages.length === 0) return;
    const name = collectionName.trim();
    if (!name) {
      toast.error("Enter a collection name before uploading");
      return;
    }

    setIsSaving(true);
    try {
      const payload = await Promise.all(
        pendingImages.map(async ({ id, file }) => ({
          clientId: id,
          fileName: file.name,
          fileBytes: await file.arrayBuffer(),
          mimeType: file.type || "application/octet-stream",
        })),
      );
      await enqueueImageUpload({ agentId, collectionName: name, files: payload });
      toast.success(
        `${pendingImages.length} asset${pendingImages.length > 1 ? "s" : ""} queued for upload`,
      );
      revokePendingPreviews(pendingImages);
      setPendingImages([]);
      setCollectionName("");
    } catch (error) {
      console.error(error);
      toast.error("Failed to upload media assets");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredEntries = useMemo(() => {
    return entries ?? [];
  }, [entries]);

  const grouped = useMemo(() => {
    const map = new Map<string, NonNullable<typeof entries>>();
    for (const entry of filteredEntries) {
      const key = entry.collectionName ?? "Untitled";
      const list = map.get(key) ?? [];
      list.push(entry);
      map.set(key, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filteredEntries]);

  const hasEntries = filteredEntries.length > 0;

  if (!canManage && !hasEntries) {
    return <KnowledgeBaseEmptyState />;
  }

  const titleText = 'Media Assets';
  const singularText = 'media asset';
  const pluralText = 'media assets';
  const uploaderTypes = ["jpg", "jpeg", "png", "webp", "gif", "heic", "pdf"];

  return (
    <>
      {canManage ? (
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Add {titleText}</h2>
        <div className="rounded-lg border border-border bg-card p-4 space-y-4">
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Collection name
              </label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                    aria-label="Why collection names matter"
                  >
                    <Info className="size-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-left">
                  Use a clear, descriptive name for this group of {pluralText}. It is
                  included in each uploaded file name so your AI agent can find
                  and use the right assets when answering questions.
                </TooltipContent>
              </Tooltip>
            </div>
            <Input
              value={collectionName}
              onChange={(e) => setCollectionName(e.target.value)}
              placeholder="e.g. Price lists, Product photos"
              disabled={isSaving}
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              The collection name is added to every file name on upload.
            </p>

          </div>

          <FileUploader
            handleChange={(fileOrFiles) => {
              handleAddImages(normalizeUploaderFiles(fileOrFiles));
            }}
            onSizeError={() => {
              toast.error(`File exceeds the ${formatFileSize(maxFileSize)} limit`);
            }}
            onTypeError={(fileName: string) => {
              toast.error(`${fileName} is not a supported file type`);
            }}
            disabled={isSaving}
            multiple
            maxSize={maxFileSize}
            types={uploaderTypes}
          >
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-6 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer">
              <Upload className="size-8 text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-foreground">
                Drag & drop images or PDFs here
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                or click to browse (max {formatFileSize(maxFileSize)} each)
              </p>
            </div>
          </FileUploader>

          {pendingImages.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {pendingImages.length} {pendingImages.length === 1 ? singularText : pluralText} ready to upload
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleClearPending}
                  disabled={isSaving}
                >
                  Clear all
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {pendingImages.map((item) => (
                  <div
                    key={item.id}
                    className="group relative overflow-hidden rounded-lg border border-border bg-muted"
                  >
                    {item.file.type.startsWith("image/") ? (
                      <img
                        src={item.previewUrl}
                        alt={item.file.name}
                        className="aspect-square w-full object-cover"
                      />
                    ) : (
                      <div className="flex aspect-square w-full items-center justify-center bg-background">
                        <FileText className="size-12 text-muted-foreground" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemovePending(item.id)}
                      disabled={isSaving}
                      className="absolute top-1.5 right-1.5 rounded-full bg-background/90 p-1 text-muted-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100 hover:text-destructive disabled:opacity-50"
                      aria-label={`Remove ${item.file.name}`}
                    >
                      <X className="size-3.5" />
                    </button>
                    <div className="border-t border-border bg-card px-2 py-1.5">
                      <p className="truncate text-xs text-foreground" title={item.file.name}>
                        {item.file.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground tabular-nums">
                        {formatFileSize(item.file.size)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClearPending}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={isSaving || !collectionName.trim()}
                >
                  {isSaving ? (
                    <>
                      <Spinner className="size-4" />
                      Uploading…
                    </>
                  ) : (
                    `Upload ${pendingImages.length} ${pendingImages.length === 1 ? singularText : pluralText}`
                  )}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
      ) : null}

      {hasEntries && (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3 font-medium text-muted-foreground">{canManage ? `Your ${pluralText}` : 'Sources'}</h2>
          <div className="space-y-3">
            {grouped.map(([name, groupEntries]) => (
              <Collapsible key={name} defaultOpen className="rounded-lg border border-border bg-card">
                <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                    <span className="text-sm font-medium truncate">{name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {groupEntries.length} {groupEntries.length === 1 ? singularText : pluralText}
                    </span>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="px-4 pb-4">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {groupEntries.map((entry) => {
                      const preview = imagePreviewUrl(entry);
                      const inProgress = isKbImageInProgress(entry.status);
                      const isImg = entry.mediaType?.startsWith("image/");
                      return (
                        <div
                          key={entry._id}
                          className="group relative overflow-hidden rounded-lg border border-border bg-muted"
                        >
                          {isImg && preview ? (
                            <img
                              src={preview}
                              alt={entry.filename ?? "Image"}
                              className="aspect-square w-full object-cover"
                            />
                          ) : (
                            <div className="flex aspect-square w-full items-center justify-center bg-background">
                              {inProgress ? (
                                <Spinner className="size-5 text-yellow-500" />
                              ) : isImg ? (
                                <ImageIcon className="size-6 text-muted-foreground" />
                              ) : (
                                <FileText className="size-12 text-muted-foreground" />
                              )}
                            </div>
                          )}
                          <div className="border-t border-border bg-card px-2 py-1.5">
                            <p
                              className="truncate text-xs text-foreground"
                              title={entry.filename ?? undefined}
                            >
                              {preview ? (
                                <a href={preview} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                  {entry.filename}
                                </a>
                              ) : (
                                entry.filename
                              )}
                            </p>
                            <div className="mt-0.5 flex items-center justify-between gap-1">
                              <StatusBadge
                                status={entry.status === "ready" ? "completed" : entry.status}
                              />
                              <div className="flex items-center gap-1 shrink-0">
                                {entry.fileSize != null && entry.fileSize > 0 ? (
                                  <span className="text-[11px] text-muted-foreground tabular-nums">
                                    {formatFileSize(entry.fileSize)}
                                  </span>
                                ) : null}
                                {!inProgress && entry.status === "ready" ? (
                                  <div className="flex size-3.5 shrink-0 items-center justify-center rounded-full bg-emerald-600">
                                    <Check className="size-2 text-white" />
                                  </div>
                                ) : null}
                                {!inProgress ? (
                                  canManage ? (
                                  <button
                                    type="button"
                                    onClick={() => openDeleteDialog('media', entry.clientId)}
                                    className="rounded p-0.5 text-muted-foreground hover:text-destructive"
                                    aria-label={`Delete ${entry.filename ?? singularText}`}
                                  >
                                    <Trash2 className="size-3" />
                                  </button>
                                  ) : null
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
