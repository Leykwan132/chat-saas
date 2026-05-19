"use client";

import {
  Attachment,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from "@/components/ai-elements/attachments";
import {
  PromptInput,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  type PromptInputMessage,
  usePromptInputAttachments,
} from "@/components/ai-elements/prompt-input";
import { cn } from "@/lib/utils";
import type { ChatStatus } from "ai";
import { PlusIcon } from "lucide-react";
import {
  MediaAttachmentUploadProvider,
  useMediaAttachmentUploads,
  type MediaUploadStatus,
} from "@/hooks/useMediaAttachmentUploads";
import { Spinner } from "@/components/ui/spinner";
import {
  memo,
  useCallback,
  useLayoutEffect,
  useRef,
  type ChangeEvent,
  type Ref,
} from "react";

const PROMPT_TEXTAREA_MAX_HEIGHT_PX = 192;

function autoResizeTextarea(element: HTMLTextAreaElement) {
  const scrollTop = element.scrollTop;
  element.style.width = "100%";
  element.style.maxWidth = "100%";
  element.style.height = "0px";
  const scrollHeight = element.scrollHeight;
  const nextHeight = Math.min(scrollHeight, PROMPT_TEXTAREA_MAX_HEIGHT_PX);
  element.style.height = `${nextHeight}px`;
  element.style.overflowY =
    scrollHeight > PROMPT_TEXTAREA_MAX_HEIGHT_PX ? "auto" : "hidden";
  if (scrollHeight > PROMPT_TEXTAREA_MAX_HEIGHT_PX) {
    element.scrollTop = scrollTop;
  }
}

function mergeTextareaRefs(
  node: HTMLTextAreaElement | null,
  externalRef?: Ref<HTMLTextAreaElement>,
) {
  if (typeof externalRef === "function") {
    externalRef(node);
  } else if (externalRef) {
    externalRef.current = node;
  }
}

type AttachmentFile = ReturnType<
  typeof usePromptInputAttachments
>["files"][number];

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
      uploadStatus === "queued" || uploadStatus === "uploading";

    const displayData =
      previewUrl && attachment.type === "file"
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

ChatAttachmentItem.displayName = "ChatAttachmentItem";

function ChatPromptInputAttachmentsPlain() {
  const attachments = usePromptInputAttachments();
  const handleRemove = useCallback(
    (id: string) => attachments.remove(id),
    [attachments],
  );

  if (attachments.files.length === 0) {
    return null;
  }

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
    (id: string) => {
      void uploadState.handleRemove(id);
    },
    [uploadState],
  );

  if (attachments.files.length === 0) {
    return null;
  }

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

function ChatPromptInputAttachments({
  enableMediaUpload,
}: {
  enableMediaUpload?: boolean;
}) {
  if (enableMediaUpload) {
    return <ChatPromptInputAttachmentsWithUpload />;
  }
  return <ChatPromptInputAttachmentsPlain />;
}

function ChatPromptInputAttachButton({ disabled }: { disabled?: boolean }) {
  const attachments = usePromptInputAttachments();

  return (
    <PromptInputButton
      disabled={disabled}
      onClick={() => attachments.openFileDialog()}
      tooltip={{ content: "Attach image" }}
      type="button"
    >
      <PlusIcon className="size-4" />
    </PromptInputButton>
  );
}

function ChatPromptInputSubmit({
  allowAttachments,
  attachmentsUploadBlocked,
  disabled,
  hasText,
  status,
}: {
  allowAttachments?: boolean;
  attachmentsUploadBlocked?: boolean;
  disabled?: boolean;
  hasText: boolean;
  status?: ChatStatus;
}) {
  const attachments = usePromptInputAttachments();
  const canSubmit =
    hasText || (allowAttachments === true && attachments.files.length > 0);

  return (
    <PromptInputSubmit
      disabled={disabled || !canSubmit || attachmentsUploadBlocked}
      status={status}
    />
  );
}

function ChatPromptInputSubmitWithUploadGate(
  props: {
    allowAttachments?: boolean;
    disabled?: boolean;
    hasText: boolean;
    status?: ChatStatus;
  },
) {
  const uploadState = useMediaAttachmentUploads();
  const attachmentsUploadBlocked =
    uploadState.hasPending || uploadState.hasFailed || !uploadState.allReady;

  return (
    <ChatPromptInputSubmit
      {...props}
      attachmentsUploadBlocked={attachmentsUploadBlocked}
    />
  );
}

function ChatPromptInputSubmitWithUploads({
  enableMediaUpload,
  ...props
}: {
  allowAttachments?: boolean;
  disabled?: boolean;
  enableMediaUpload?: boolean;
  hasText: boolean;
  status?: ChatStatus;
}) {
  if (enableMediaUpload) {
    return <ChatPromptInputSubmitWithUploadGate {...props} />;
  }
  return <ChatPromptInputSubmit {...props} />;
}

/** Constrains prompt input to the parent width (flex-safe, no horizontal overflow). */
export function ChatPromptInputShell({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "w-full min-w-0 max-w-full overflow-hidden",
        className,
      )}
    >
      {children}
    </div>
  );
}

export type ChatPromptInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (message: PromptInputMessage) => void | Promise<void>;
  placeholder?: string;
  disabled?: boolean;
  submitDisabled?: boolean;
  submitStatus?: ChatStatus;
  textareaRef?: Ref<HTMLTextAreaElement>;
  className?: string;
  containerClassName?: string;
  /** When true, shows image attachment previews and a + button in the footer. */
  allowImageAttachments?: boolean;
  /** When true with image attachments, uploads to R2 on attach via workpool. */
  enableMediaUpload?: boolean;
};

/** Shared layout for playground + inbox (attachment UI is optional). */
const PROMPT_TEXTAREA_CLASS =
  "field-sizing-fixed box-border min-h-0 w-full max-w-full min-w-0 max-h-48 overflow-x-hidden overflow-y-auto no-scrollbar px-4 pt-4 pb-2 wrap-break-word [overflow-wrap:anywhere]";
const PROMPT_FOOTER_CLASS = "px-4 pb-3";

export function ChatPromptInput({
  value,
  onChange,
  onSubmit,
  placeholder = "Type a message...",
  disabled = false,
  submitDisabled = false,
  submitStatus,
  textareaRef,
  className,
  containerClassName,
  allowImageAttachments = false,
  enableMediaUpload = false,
}: ChatPromptInputProps) {
  const internalTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const useUploads = allowImageAttachments && enableMediaUpload;

  const setTextareaRef = useCallback(
    (node: HTMLTextAreaElement | null) => {
      internalTextareaRef.current = node;
      mergeTextareaRefs(node, textareaRef);
      if (node) {
        autoResizeTextarea(node);
      }
    },
    [textareaRef],
  );

  useLayoutEffect(() => {
    const node = internalTextareaRef.current;
    if (node) {
      autoResizeTextarea(node);
    }
  }, [value]);

  const handleTextareaChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      autoResizeTextarea(e.currentTarget);
      onChange(e.currentTarget.value);
    },
    [onChange],
  );

  const promptBody = (
    <>
      {allowImageAttachments ? (
        <ChatPromptInputAttachments enableMediaUpload={useUploads} />
      ) : null}
      <PromptInputBody>
        <PromptInputTextarea
          className={PROMPT_TEXTAREA_CLASS}
          disabled={disabled}
          onChange={handleTextareaChange}
          placeholder={placeholder}
          ref={setTextareaRef}
          rows={1}
          value={value}
        />
      </PromptInputBody>
      <PromptInputFooter
        className={cn(
          PROMPT_FOOTER_CLASS,
          !allowImageAttachments && "justify-end",
        )}
      >
        {allowImageAttachments ? (
          <PromptInputTools>
            <ChatPromptInputAttachButton disabled={disabled} />
          </PromptInputTools>
        ) : null}
        <ChatPromptInputSubmitWithUploads
          allowAttachments={allowImageAttachments}
          disabled={submitDisabled}
          enableMediaUpload={useUploads}
          hasText={value.trim().length > 0}
          status={submitStatus}
        />
      </PromptInputFooter>
    </>
  );

  return (
    <ChatPromptInputShell className={containerClassName}>
      <PromptInput
        accept={allowImageAttachments ? "image/*" : undefined}
        className={cn("w-full min-w-0 max-w-full", className)}
        globalDrop={allowImageAttachments}
        maxFiles={allowImageAttachments ? 5 : undefined}
        multiple={allowImageAttachments}
        onSubmit={onSubmit}
      >
        {useUploads ? (
          <MediaAttachmentUploadProvider>{promptBody}</MediaAttachmentUploadProvider>
        ) : (
          promptBody
        )}
      </PromptInput>
    </ChatPromptInputShell>
  );
}
