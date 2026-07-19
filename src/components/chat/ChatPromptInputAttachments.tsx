import {
  Attachment,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from '@/components/ai-elements/attachments';
import {
  PromptInputButton,
  usePromptInputAttachments,
} from '@/components/ai-elements/prompt-input';
import {
  useMediaAttachmentUploads,
  type MediaUploadStatus,
} from '@/hooks/useMediaAttachmentUploads';
import { Spinner } from '@/components/ui/spinner';
import { memo, useCallback } from 'react';
import { PlusIcon } from 'lucide-react';

type AttachmentFile = ReturnType<
  typeof usePromptInputAttachments
>['files'][number];

const ChatAttachmentItem = memo(
  ({
    attachment,
    onRemove,
    uploadStatus,
    previewUrl,
  }: {
    attachment: AttachmentFile;
    onRemove: (id: string) => void;
    uploadStatus?: MediaUploadStatus;
    previewUrl?: string;
  }) => {
    const handleRemove = useCallback(
      () => onRemove(attachment.id),
      [onRemove, attachment.id],
    );
    const isUploading =
      uploadStatus === 'queued' || uploadStatus === 'uploading';
    const displayData =
      previewUrl && attachment.type === 'file'
        ? { ...attachment, url: previewUrl }
        : attachment;

    return (
      <Attachment
        className="relative size-24 overflow-hidden rounded-lg"
        data={displayData}
        onRemove={handleRemove}
      >
        <AttachmentPreview />
        {isUploading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60">
            <Spinner className="size-6 text-muted-foreground" />
          </div>
        ) : null}
        <AttachmentRemove className="top-1.5 right-1.5 size-7 [&>svg]:size-4" />
      </Attachment>
    );
  },
);

ChatAttachmentItem.displayName = 'ChatAttachmentItem';

function ChatPromptInputAttachmentsPlain() {
  const attachments = usePromptInputAttachments();
  const handleRemove = useCallback(
    (id: string) => attachments.remove(id),
    [attachments],
  );

  if (attachments.files.length === 0) return null;

  return (
    <Attachments className="ml-0 w-full justify-start px-4 pt-4" variant="grid">
      {attachments.files.map((attachment) => (
        <ChatAttachmentItem
          attachment={attachment}
          key={attachment.id}
          onRemove={handleRemove}
        />
      ))}
    </Attachments>
  );
}

function ChatPromptInputAttachmentsWithUpload() {
  const attachments = usePromptInputAttachments();
  const uploadState = useMediaAttachmentUploads();
  const handleRemove = useCallback(
    (id: string) => void uploadState.handleRemove(id),
    [uploadState],
  );

  if (attachments.files.length === 0) return null;

  return (
    <Attachments className="ml-0 w-full justify-start px-4 pt-4" variant="grid">
      {attachments.files.map((attachment) => (
        <ChatAttachmentItem
          attachment={attachment}
          key={attachment.id}
          onRemove={handleRemove}
          previewUrl={uploadState.getPreviewUrl(attachment.id, attachment.url)}
          uploadStatus={uploadState.statusByClientId.get(attachment.id)}
        />
      ))}
    </Attachments>
  );
}

export function ChatPromptInputAttachments({
  enableMediaUpload,
}: {
  enableMediaUpload?: boolean;
}) {
  if (enableMediaUpload) {
    return <ChatPromptInputAttachmentsWithUpload />;
  }
  return <ChatPromptInputAttachmentsPlain />;
}

export function ChatPromptInputAttachButton({
  disabled,
}: {
  disabled?: boolean;
}) {
  const attachments = usePromptInputAttachments();

  return (
    <PromptInputButton
      disabled={disabled}
      onClick={() => attachments.openFileDialog()}
      tooltip={{ content: 'Attach image' }}
      type="button"
      size="icon-sm"
      className="flex size-8 items-center justify-center rounded-lg border border-border/40 bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
    >
      <PlusIcon className="size-4" />
    </PromptInputButton>
  );
}
