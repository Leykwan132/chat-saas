import type { ReactNode } from 'react';
import { useState } from 'react';
import { Check, FileText, Image as ImageIcon, Trash2, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  formatFileSize,
  isKbImageInProgress,
  StatusBadge,
} from '@/components/knowledge-base/helpers';
import { cn } from '@/lib/utils';
import { WorkflowImagePreview } from './WorkflowImagePreview';
import { WorkflowMediaKindBadge } from './WorkflowMediaKindBadge';
import type { WorkflowMediaEntry } from './workflowMediaTypes';

type WorkflowMediaGridProps = {
  entries: WorkflowMediaEntry[];
  onDelete?: (clientId: string) => void;
  deletingClientId?: string;
  children?: ReactNode;
  className?: string;
  density?: 'default' | 'compact';
};

function mediaPreviewUrl(entry: WorkflowMediaEntry) {
  if (entry.publicUrl && entry.status === 'ready') return entry.publicUrl;
  return null;
}

function WorkflowFilePreviewTile({
  entry,
  preview,
  isImage,
  isVideo,
  density,
}: {
  entry: WorkflowMediaEntry;
  preview: string | null;
  isImage: boolean;
  isVideo: boolean;
  density: 'default' | 'compact';
}) {
  const icon = isImage ? (
    <ImageIcon className={cn('text-muted-foreground', density === 'compact' ? 'size-5' : 'size-6')} />
  ) : isVideo ? (
    <Video className={cn('text-muted-foreground', density === 'compact' ? 'size-5' : 'size-8')} />
  ) : (
    <FileText className={cn('text-muted-foreground', density === 'compact' ? 'size-6' : 'size-10')} />
  );
  const className = cn(
    'flex items-center justify-center bg-background transition-colors',
    density === 'compact' ? 'size-full' : 'aspect-square w-full',
    preview && 'cursor-pointer hover:bg-muted/60',
  );

  if (!preview) {
    return <div className={className}>{icon}</div>;
  }

  return (
    <a
      href={preview}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      aria-label={`Open ${entry.filename ?? 'file'} in new tab`}
    >
      {icon}
    </a>
  );
}

export function WorkflowMediaGrid({
  entries,
  onDelete,
  deletingClientId,
  children,
  className,
  density = 'default',
}: WorkflowMediaGridProps) {
  const [failedPreviewClientIds, setFailedPreviewClientIds] = useState<Set<string>>(
    () => new Set(),
  );
  const visibleEntries = entries.filter((entry) => !failedPreviewClientIds.has(entry.clientId));
  const hideFailedPreview = (clientId: string) => {
    setFailedPreviewClientIds((current) => {
      const next = new Set(current);
      next.add(clientId);
      return next;
    });
  };

  if (visibleEntries.length === 0 && !children) {
    return (
      <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center">
        <p className="text-sm text-muted-foreground">No media yet.</p>
      </div>
    );
  }

  const layoutClassName = density === 'compact'
    ? 'flex flex-nowrap gap-3'
    : 'grid grid-cols-2 gap-3 sm:grid-cols-3';

  return (
    <div className={cn(layoutClassName, className)}>
      {visibleEntries.map((entry) => {
        const preview = mediaPreviewUrl(entry);
        const isImage = entry.mediaType.startsWith('image/');
        const isVideo = entry.mediaType.startsWith('video/');
        const inProgress = isKbImageInProgress(entry.status);
        if (density === 'compact') {
          return (
            <div
              key={entry._id}
              className="group relative size-16 overflow-hidden rounded-lg border border-border bg-muted"
              title={entry.filename}
            >
              {isImage && preview ? (
                <WorkflowImagePreview src={preview} alt={entry.filename ?? 'Media'}>
                  <button
                    type="button"
                    className="block size-full cursor-zoom-in"
                    aria-label={`Preview ${entry.filename ?? 'media'}`}
                  >
                    <img
                      src={preview}
                      alt={entry.filename ?? 'Media'}
                      className="size-full object-cover"
                      onError={() => hideFailedPreview(entry.clientId)}
                    />
                  </button>
                </WorkflowImagePreview>
              ) : isVideo && preview ? (
                <WorkflowImagePreview
                  src={preview}
                  alt={entry.filename ?? 'Video'}
                  mediaType={entry.mediaType}
                >
                  <button
                    type="button"
                    className="block size-full cursor-zoom-in"
                    aria-label={`Preview ${entry.filename ?? 'video'}`}
                  >
                    <video
                      src={preview}
                      className="size-full object-cover"
                      muted
                      playsInline
                      preload="metadata"
                    />
                  </button>
                </WorkflowImagePreview>
              ) : (
                <WorkflowFilePreviewTile
                  entry={entry}
                  preview={preview}
                  isImage={isImage}
                  isVideo={isVideo}
                  density={density}
                />
              )}
              {isImage ? <WorkflowMediaKindBadge kind="image" /> : null}
              {isVideo ? <WorkflowMediaKindBadge kind="video" /> : null}
              {onDelete && !inProgress ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="absolute right-1 top-1 size-5 rounded-full bg-background/90 text-muted-foreground opacity-0 shadow-sm transition-opacity hover:text-destructive group-hover:opacity-100"
                  disabled={deletingClientId === entry.clientId}
                  onClick={() => onDelete(entry.clientId)}
                >
                  <Trash2 className="size-3" />
                  <span className="sr-only">Delete media</span>
                </Button>
              ) : null}
              {inProgress ? (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/60">
                  <Spinner className="size-5 text-muted-foreground" />
                </div>
              ) : null}
            </div>
          );
        }
        return (
          <div
            key={entry._id}
            className="group relative overflow-hidden rounded-lg border border-border bg-muted"
          >
            {isImage && preview ? (
              <WorkflowImagePreview src={preview} alt={entry.filename ?? 'Media'}>
                <button
                  type="button"
                  className="block aspect-square w-full cursor-zoom-in"
                  aria-label={`Preview ${entry.filename ?? 'media'}`}
                >
                  <img
                    src={preview}
                    alt={entry.filename ?? 'Media'}
                    className="size-full object-cover"
                    onError={() => hideFailedPreview(entry.clientId)}
                  />
                </button>
              </WorkflowImagePreview>
            ) : isVideo && preview ? (
              <WorkflowImagePreview
                src={preview}
                alt={entry.filename ?? 'Video'}
                mediaType={entry.mediaType}
              >
                <button
                  type="button"
                  className="block aspect-square w-full cursor-zoom-in"
                  aria-label={`Preview ${entry.filename ?? 'video'}`}
                >
                  <video
                    src={preview}
                    className="size-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                  />
                </button>
              </WorkflowImagePreview>
            ) : (
              <WorkflowFilePreviewTile
                entry={entry}
                preview={preview}
                isImage={isImage}
                isVideo={isVideo}
                density={density}
              />
            )}
            {isImage ? <WorkflowMediaKindBadge kind="image" className="bottom-11" /> : null}
            {isVideo ? <WorkflowMediaKindBadge kind="video" className="bottom-11" /> : null}
            <div className="border-t border-border bg-card px-2 py-1.5">
              <p className="truncate text-xs text-foreground" title={entry.filename}>
                {preview ? (
                  <a href={preview} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {entry.filename}
                  </a>
                ) : (
                  entry.filename
                )}
              </p>
              <div className="mt-0.5 flex items-center justify-between gap-1">
                <StatusBadge status={entry.status === 'ready' ? 'completed' : entry.status} />
                <div className="flex items-center gap-1">
                  {entry.fileSize != null && entry.fileSize > 0 ? (
                    <span className="text-[11px] tabular-nums text-muted-foreground">
                      {formatFileSize(entry.fileSize)}
                    </span>
                  ) : null}
                  {!inProgress && entry.status === 'ready' ? (
                    <span className="flex size-3.5 items-center justify-center rounded-full bg-emerald-600">
                      <Check className="size-2 text-white" />
                    </span>
                  ) : null}
                  {onDelete && !inProgress ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="size-6 rounded-md text-muted-foreground hover:text-destructive"
                      disabled={deletingClientId === entry.clientId}
                      onClick={() => onDelete(entry.clientId)}
                    >
                      <Trash2 className="size-3" />
                      <span className="sr-only">Delete media</span>
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        );
      })}
      {children}
    </div>
  );
}
