export type WorkflowMediaEntry = {
  _id: string;
  clientId: string;
  status: string;
  publicUrl?: string;
  mediaType: string;
  filename?: string;
  fileSize?: number;
  createdAt: number;
};

export type WorkflowMediaUploadFile = {
  clientId: string;
  fileName: string;
  mimeType: string;
};

export type WorkflowPendingMediaUpload = WorkflowMediaUploadFile & {
  previewUrl: string;
  mediaType: string;
  fileSize: number;
  status: 'queued' | 'uploading';
};

export function shouldDisplayWorkflowMediaEntry(entry: WorkflowMediaEntry) {
  return entry.status === 'ready' && Boolean(entry.publicUrl);
}
