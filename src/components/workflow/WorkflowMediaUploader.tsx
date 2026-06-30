import { useEffect, useRef, useState } from 'react';
import { useAction, useMutation } from 'convex/react';
import { FileText, Plus, Video, X } from 'lucide-react';
import { FileUploader } from 'react-drag-drop-files';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import {
  formatFileSize,
  normalizeUploaderFiles,
} from '@/components/knowledge-base/helpers';
import { cn } from '@/lib/utils';
import { uploadWithProgress } from '@/lib/r2Upload';
import { Spinner } from '@/components/ui/spinner';
import { WorkflowImagePreview } from './WorkflowImagePreview';
import { WorkflowMediaKindBadge } from './WorkflowMediaKindBadge';
import type { WorkflowPendingMediaUpload } from './workflowMediaTypes';

type PendingMedia = WorkflowPendingMediaUpload;

type WorkflowMediaUploaderProps = {
  agentId: Id<'agents'>;
  nodeId: Id<'workflowNodes'>;
  nodeKind: 'sendImage' | 'sendFile';
  maxFileSize: number;
  disabled?: boolean;
  layout?: 'wide' | 'tile';
  density?: 'default' | 'compact';
  onError: (message: string) => void;
};

const PHOTO_VIDEO_UPLOADER_TYPES = [
  'jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif',
  'mp4', 'mpeg', 'mov', 'm4v', 'webm', '3gp',
];

const FILE_UPLOADER_TYPES = [
  'pdf', 'txt', 'csv', 'doc', 'docx',
  'xls', 'xlsx', 'ppt', 'pptx', 'zip',
];

function revokePendingPreviews(items: PendingMedia[]) {
  for (const item of items) URL.revokeObjectURL(item.previewUrl);
}

export function WorkflowMediaUploader({
  agentId,
  nodeId,
  nodeKind,
  maxFileSize,
  disabled = false,
  layout = 'wide',
  density = 'default',
  onError,
}: WorkflowMediaUploaderProps) {
  const [pendingMedia, setPendingMedia] = useState<PendingMedia[]>([]);
  const pendingRef = useRef<PendingMedia[]>([]);
  const cancelledRef = useRef(new Set<string>());
  const prepareUpload = useMutation(api.workflowMedia.prepareUpload);
  const syncUpload = useAction(api.workflowMedia.syncUpload);
  const markUploadFailed = useMutation(api.workflowMedia.markUploadFailed);
  const enqueueDelete = useAction(api.workflowMedia.enqueueDelete);

  useEffect(() => {
    pendingRef.current = pendingMedia;
  }, [pendingMedia]);

  useEffect(() => () => revokePendingPreviews(pendingRef.current), []);

  const updatePendingMedia = (
    getNextPendingMedia: (current: PendingMedia[]) => PendingMedia[],
  ) => {
    setPendingMedia((current) => {
      const next = getNextPendingMedia(current);
      return next;
    });
  };

  const removeLocalPending = (clientId: string) => {
    updatePendingMedia((current) => {
      const item = current.find((candidate) => candidate.clientId === clientId);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return current.filter((candidate) => candidate.clientId !== clientId);
    });
  };

  const patchPending = (
    clientId: string,
    patch: Partial<Pick<PendingMedia, 'status'>>,
  ) => {
    updatePendingMedia((current) =>
      current.map((item) =>
        item.clientId === clientId ? { ...item, ...patch } : item,
      ),
    );
  };

  const uploadMedia = async (item: PendingMedia, file: File) => {
    try {
      const { key, url } = await prepareUpload({
        agentId,
        nodeId,
        clientId: item.clientId,
        fileName: item.fileName,
        mimeType: item.mimeType,
        fileSize: item.fileSize,
      });
      if (cancelledRef.current.has(item.clientId)) {
        await enqueueDelete({ agentId, nodeId, clientId: item.clientId });
        removeLocalPending(item.clientId);
        return;
      }
      patchPending(item.clientId, { status: 'uploading' });
      await uploadWithProgress(url, file);
      await syncUpload({ agentId, nodeId, clientId: item.clientId, key });
      cancelledRef.current.delete(item.clientId);
      removeLocalPending(item.clientId);
    } catch (error) {
      if (!cancelledRef.current.has(item.clientId)) {
        await markUploadFailed({
          agentId,
          nodeId,
          clientId: item.clientId,
          error: error instanceof Error ? error.message : 'Upload failed',
        }).catch(() => undefined);
        onError(error instanceof Error ? error.message : 'Could not upload media');
      }
      removeLocalPending(item.clientId);
    }
  };

  const addFiles = (files: File[]) => {
    if (files.length === 0) return;
    const nextFiles = files.map((file) => ({
        clientId: crypto.randomUUID(),
        fileName: file.name,
        fileSize: file.size,
        mediaType: file.type || 'application/octet-stream',
        mimeType: file.type || 'application/octet-stream',
        previewUrl: URL.createObjectURL(file),
        status: 'queued' as const,
      }));
    updatePendingMedia((current) => [...current, ...nextFiles]);
    for (const [index, file] of files.entries()) {
      void uploadMedia(nextFiles[index], file);
    }
  };

  const removePending = (clientId: string) => {
    cancelledRef.current.add(clientId);
    removeLocalPending(clientId);
    void enqueueDelete({ agentId, nodeId, clientId }).catch(() => undefined);
  };

  const locked = disabled;
  const isTile = layout === 'tile';
  const isCompact = density === 'compact';
  const uploaderTypes = nodeKind === 'sendFile'
    ? FILE_UPLOADER_TYPES
    : PHOTO_VIDEO_UPLOADER_TYPES;
  const uploadTitle = nodeKind === 'sendFile'
    ? 'Select files to send'
    : 'Select photos/videos to send';
  const uploadDescription = nodeKind === 'sendFile'
    ? `Documents or files, max ${formatFileSize(maxFileSize)} each`
    : `Photos or videos, max ${formatFileSize(maxFileSize)} each`;

  return (
    <div className={isTile ? 'contents' : 'col-span-full space-y-3'}>
      {pendingMedia.length > 0 ? (
        <div className={cn('flex flex-nowrap gap-3 overflow-x-auto', isTile && 'contents')}>
          {pendingMedia.map((item) => (
            <div
              key={item.clientId}
              className={cn(
                'group relative shrink-0 overflow-hidden rounded-lg border border-border bg-muted',
                isCompact ? 'size-16' : 'size-28',
              )}
            >
              {item.mediaType.startsWith('image/') ? (
                <WorkflowImagePreview src={item.previewUrl} alt={item.fileName}>
                  <button
                    type="button"
                    className="block size-full cursor-zoom-in"
                    aria-label={`Preview ${item.fileName}`}
                  >
                    <img
                      src={item.previewUrl}
                      alt={item.fileName}
                      className="size-full object-cover"
                    />
                  </button>
                </WorkflowImagePreview>
              ) : item.mediaType.startsWith('video/') ? (
                <WorkflowImagePreview
                  src={item.previewUrl}
                  alt={item.fileName}
                  mediaType={item.mediaType}
                >
                  <button
                    type="button"
                    className="block size-full cursor-zoom-in"
                    aria-label={`Preview ${item.fileName}`}
                  >
                    <video
                      src={item.previewUrl}
                      className="size-full object-cover"
                      muted
                      playsInline
                      preload="metadata"
                    />
                  </button>
                </WorkflowImagePreview>
              ) : (
                <div className="flex size-full items-center justify-center bg-background">
                  {nodeKind === 'sendImage' ? (
                    <Video className={cn('text-muted-foreground', isCompact ? 'size-6' : 'size-10')} />
                  ) : (
                    <FileText className={cn('text-muted-foreground', isCompact ? 'size-6' : 'size-10')} />
                  )}
                </div>
              )}
              {item.mediaType.startsWith('image/') ? (
                <WorkflowMediaKindBadge kind="image" />
              ) : null}
              {item.mediaType.startsWith('video/') ? (
                <WorkflowMediaKindBadge kind="video" />
              ) : null}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/60">
                <Spinner className="size-5 text-muted-foreground" />
              </div>
              <button
                type="button"
                onClick={() => removePending(item.clientId)}
                disabled={locked}
                className="absolute right-1 top-1 rounded-full bg-background/90 p-1 text-muted-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100 hover:text-destructive disabled:opacity-50"
                aria-label={`Remove ${item.fileName}`}
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <FileUploader
        handleChange={(fileOrFiles) => {
          addFiles(normalizeUploaderFiles(fileOrFiles));
        }}
        onSizeError={() => onError(`File exceeds the ${formatFileSize(maxFileSize)} limit`)}
        onTypeError={(fileName: string) => onError(`${fileName} is not a supported file type`)}
        disabled={locked}
        multiple
        maxSize={maxFileSize}
        types={uploaderTypes}
      >
        <div
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dotted border-muted-foreground/40 bg-background text-center transition-colors hover:border-foreground/50 hover:bg-muted/30',
            isTile
              ? cn('aspect-square p-4', isCompact ? 'size-16 p-0' : 'min-h-36')
              : cn(isCompact ? 'min-h-28 p-4' : 'min-h-40 p-5'),
            locked && 'cursor-not-allowed opacity-60',
          )}
        >
          {isCompact ? (
            <Plus className={cn('text-muted-foreground', isCompact ? 'size-4' : 'size-5')} />
          ) : (
            <span className="mb-2 flex size-10 items-center justify-center rounded-full border border-dotted border-muted-foreground/60">
              <Plus className="size-5 text-muted-foreground" />
            </span>
          )}
          {isCompact ? null : (
            <p className="text-sm font-medium text-foreground">
              {isTile ? `Add more ${nodeKind === 'sendFile' ? 'files' : 'media'}` : uploadTitle}
            </p>
          )}
          {isCompact ? null : (
            <p className="mt-1 text-xs text-muted-foreground">
              {uploadDescription}
            </p>
          )}
        </div>
      </FileUploader>
    </div>
  );
}
