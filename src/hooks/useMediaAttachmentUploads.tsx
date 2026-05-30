"use client";

import { usePromptInputAttachments } from "@/components/ai-elements/prompt-input";
import { uploadWithProgress } from "@/lib/r2Upload";
import { api } from "../../convex/_generated/api";
import { useAction, useMutation, useQuery } from "convex/react";
import { useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { createContext } from "react";
import { toast } from "sonner";

export type MediaUploadStatus =
  | "queued"
  | "uploading"
  | "ready"
  | "failed"
  | "cancelled"
  | "deleting";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const r2ClientApi = (api as any)["media/r2Client"];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mediaApi = (api as any)["media/attachments"];

/**
 * Inbox attachment upload — same steps as `@convex-dev/r2/react` `useUploadFile`
 * (signed URL → PUT → syncMetadata), with per-attachment `clientId` and org-scoped keys.
 */
function useInboxR2Upload() {
  const generateUploadUrl = useMutation(r2ClientApi.generateUploadUrl);
  const syncMetadata = useAction(r2ClientApi.syncMetadata);

  return useCallback(
    async (
      file: File,
      clientId: string,
      onProgress?: (pct: number) => void,
    ) => {
      const { url, key } = await generateUploadUrl({
        clientId,
        mediaType: file.type || "image/png",
        filename: file.name,
      });
      await uploadWithProgress(url, file, (p) => {
        if (p.total > 0) {
          onProgress?.(Math.round((p.loaded / p.total) * 100));
        }
      });
      await syncMetadata({ key, clientId });
      return key;
    },
    [generateUploadUrl, syncMetadata],
  );
}

type MediaAttachmentUploadContextValue = {
  statusByClientId: Map<string, MediaUploadStatus>;
  getPreviewUrl: (clientId: string, blobUrl: string | undefined) => string | undefined;
  /** Returns 0–100 while uploading via XHR progress, or undefined when not active. */
  getUploadProgress: (clientId: string) => number | undefined;
  handleRemove: (clientId: string) => void;
  hasPending: boolean;
  hasFailed: boolean;
  allReady: boolean;
};

const MediaAttachmentUploadContext =
  createContext<MediaAttachmentUploadContextValue | null>(null);

export function MediaAttachmentUploadProvider({
  children,
}: {
  children: ReactNode;
}) {
  const value = useMediaAttachmentUploadsInner();
  return (
    <MediaAttachmentUploadContext.Provider value={value}>
      {children}
    </MediaAttachmentUploadContext.Provider>
  );
}

export function useMediaAttachmentUploads() {
  const ctx = useContext(MediaAttachmentUploadContext);
  if (ctx === null) {
    throw new Error(
      "useMediaAttachmentUploads must be used within MediaAttachmentUploadProvider",
    );
  }
  return ctx;
}

function useMediaAttachmentUploadsInner(): MediaAttachmentUploadContextValue {
  const attachments = usePromptInputAttachments();
  const uploadToR2 = useInboxR2Upload();
  const enqueueDelete = useAction(mediaApi.enqueueDelete);
  const cancelUpload = useMutation(mediaApi.cancelUpload);
  const markUploadFailed = useMutation(mediaApi.markUploadFailed);

  const clientIds = useMemo(
    () => attachments.files.map((f) => f.id),
    [attachments.files],
  );

  const uploads = useQuery(
    mediaApi.getUploadsByClientIds,
    clientIds.length > 0 ? { clientIds } : "skip",
  );

  const startedRef = useRef(new Set<string>());
  const cancelledRef = useRef(new Set<string>());
  // Tracks 0–100 progress per upload. Stored in a ref to avoid re-renders on
  // every XHR progress tick — consumers call getUploadProgress() on demand.
  const progressRef = useRef(new Map<string, number>());

  const uploadFile = useCallback(
    async (file: (typeof attachments.files)[number]) => {
      if (!file.url?.startsWith("blob:")) return;

      const blobResponse = await fetch(file.url);
      const blobFile = new File(
        [await blobResponse.blob()],
        file.filename ?? "image",
        { type: file.mediaType ?? "image/png" },
      );

      // Initialise progress at 0 so getUploadProgress returns a number immediately
      progressRef.current.set(file.id, 0);
      console.log("[useMediaAttachmentUploads] Beginning R2 upload for file:", { id: file.id, filename: file.filename, size: blobFile.size });

      try {
        await uploadToR2(blobFile, file.id, (pct) => {
          progressRef.current.set(file.id, pct);
        });
        // Upload complete — clear progress entry
        progressRef.current.delete(file.id);
        cancelledRef.current.delete(file.id);
        console.log("[useMediaAttachmentUploads] R2 upload succeeded for file:", file.id);
      } catch (e) {
        progressRef.current.delete(file.id);
        console.error("[useMediaAttachmentUploads] R2 upload failed for file:", file.id, e);
        if (!cancelledRef.current.has(file.id)) {
          await markUploadFailed({
            clientId: file.id,
            error: e instanceof Error ? e.message : "Upload failed",
          });
          toast.error(
            e instanceof Error ? e.message : "Failed to upload image",
          );
        }
      }
    },
    [uploadToR2, markUploadFailed],
  );

  useEffect(() => {
    for (const file of attachments.files) {
      if (startedRef.current.has(file.id)) continue;
      startedRef.current.add(file.id);
      void uploadFile(file);
    }
  }, [attachments.files, uploadFile]);

  const statusByClientId = useMemo(() => {
    const map = new Map<string, MediaUploadStatus>();
    for (const row of uploads ?? []) {
      map.set(row.clientId, row.status as MediaUploadStatus);
    }
    for (const file of attachments.files) {
      if (!map.has(file.id)) {
        if (file.url && !file.url.startsWith("blob:")) {
          map.set(file.id, "ready");
        } else if (startedRef.current.has(file.id)) {
          map.set(file.id, "uploading");
        }
      }
    }
    return map;
  }, [uploads, attachments.files]);

  const publicUrlByClientId = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of uploads ?? []) {
      // publicUrl is resolved server-side by the backend using MEDIA_CDN_BASE_URL
      if (row.publicUrl && row.status === "ready") {
        map.set(row.clientId, row.publicUrl);
      }
    }
    return map;
  }, [uploads]);

  const hasPending = clientIds.some((id) => {
    const status = statusByClientId.get(id);
    return (
      status === undefined ||
      status === "queued" ||
      status === "uploading"
    );
  });

  const hasFailed = clientIds.some(
    (id) => statusByClientId.get(id) === "failed",
  );

  const allReady =
    clientIds.length === 0 ||
    clientIds.every((id) => statusByClientId.get(id) === "ready");

  const handleRemove = useCallback(
    (clientId: string) => {
      cancelledRef.current.add(clientId);
      const status = statusByClientId.get(clientId);

      attachments.remove(clientId);
      startedRef.current.delete(clientId);
      progressRef.current.delete(clientId);

      void (async () => {
        if (status === "ready") {
          await enqueueDelete({ clientId }).catch(() => undefined);
          return;
        }
        await cancelUpload({ clientId }).catch(() => undefined);
      })();
    },
    [attachments, cancelUpload, enqueueDelete, statusByClientId],
  );

  const getPreviewUrl = useCallback(
    (clientId: string, blobUrl: string | undefined) => {
      if (blobUrl?.startsWith("blob:")) {
        return blobUrl;
      }
      return publicUrlByClientId.get(clientId) ?? blobUrl;
    },
    [publicUrlByClientId],
  );

  const getUploadProgress = useCallback(
    (clientId: string): number | undefined => {
      return progressRef.current.get(clientId);
    },
    [],
  );

  return {
    statusByClientId,
    getPreviewUrl,
    getUploadProgress,
    handleRemove,
    hasPending,
    hasFailed,
    allReady,
  };
}
