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
  useOptionalPromptInputController,
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
  useState,
  type ChangeEvent,
  type Ref,
} from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ReplyAll, ChevronDown, ChevronUp, Image as ImageIcon } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Link, useParams } from "react-router";
import { Avatar, AvatarImage, AvatarFallback, AvatarGroup } from "@/components/ui/avatar";

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
      size="icon-sm"
      className="bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground size-8 rounded-lg flex items-center justify-center border border-border/40"
    >
      <PlusIcon className="size-4" />
    </PromptInputButton>
  );
}

function ChatPromptInputQuickRepliesButton({
  disabled,
  onChange,
  textareaRef,
}: {
  disabled?: boolean;
  onChange: (value: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const { agentId } = useParams();
  const quickRepliesList = useQuery(api.quickReplies.list);
  const attachments = usePromptInputAttachments();
  const controller = useOptionalPromptInputController();
  const [open, setOpen] = useState(false);

  const handleSelectQuickReply = (reply: any) => {
    // 1. Clear existing text and attachments instantly
    attachments.clear();

    if (textareaRef.current) {
      textareaRef.current.value = reply.text;
      autoResizeTextarea(textareaRef.current);
      textareaRef.current.focus();
    }
    controller?.textInput.setInput(reply.text);
    onChange(reply.text);
    setOpen(false);

    // 2. Attach images if present via public URLs directly
    if (reply.imageUrls && reply.imageUrls.length > 0) {
      reply.imageUrls.forEach((url: string, index: number) => {
        const filename = `quick_reply_image_${index + 1}.png`;
        attachments.addUrl(url, filename, "image/png");
      });
    }
  };

  if (quickRepliesList === undefined) {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          disabled={disabled}
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground h-8 px-2 gap-1.5 flex items-center shadow-none border-none bg-transparent hover:bg-muted/50"
        >
          <ReplyAll className="size-3.5" />
          <span className="text-xs font-semibold">Quick replies</span>
          {open ? (
            <ChevronDown className="size-3.5 opacity-60 ml-0.5" />
          ) : (
            <ChevronUp className="size-3.5 opacity-60 ml-0.5" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 px-2 py-0 rounded-xl shadow-lg border border-border bg-popover z-50 flex flex-col gap-1.5">
        <div className="flex items-center justify-between px-1 pt-2 pb-1 border-b border-border/40">
          <span className="text-xs font-medium text-muted-foreground">Quick replies</span>
          <Link
            to={`/dashboard/${agentId}/quick-replies`}
            onClick={() => setOpen(false)}
            className="text-xs font-semibold text-blue-600 hover:text-blue-500 transition-colors"
          >
            Edit
          </Link>
        </div>
        <div className="flex flex-col gap-0.5 max-h-60 overflow-y-auto no-scrollbar">
          {quickRepliesList.length === 0 ? (
            <div className="text-center py-4 px-2 text-xs text-muted-foreground font-medium">
              No quick replies set yet.
            </div>
          ) : (
            quickRepliesList.map((reply, index) => {
              const isLast = index === quickRepliesList.length - 1;
              
              const itemNode = (
                <button
                  type="button"
                  onClick={() => handleSelectQuickReply(reply)}
                  className="w-full flex items-center justify-between gap-3 px-2 py-1.5 rounded-lg hover:bg-muted/60 transition-all text-left focus:outline-none active:scale-[0.99]"
                >
                  {/* Left: Text Selection */}
                  <div className="flex-1 min-w-0 flex flex-col">
                    <span className="font-semibold text-xs text-foreground truncate block">
                      {reply.title}
                    </span>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5 leading-relaxed truncate block w-full">
                      {reply.imageUrls && reply.imageUrls.length > 0 && (
                        <ImageIcon className="size-3 text-muted-foreground/80 shrink-0" />
                      )}
                      <span className="truncate flex-1">{reply.text}</span>
                    </span>
                  </div>

                  {/* Right: Small avatar group button to attach images */}
                  {reply.imageUrls && reply.imageUrls.length > 0 && (
                    <div className="relative shrink-0 flex items-center justify-center">
                      <AvatarGroup className="-space-x-1.5">
                        {reply.imageUrls.map((url: string, idx: number) => (
                          <Avatar key={idx} size="sm" className="size-6 border border-background">
                            <AvatarImage src={url} alt="" />
                            <AvatarFallback className="text-[8px] font-semibold bg-muted">CN</AvatarFallback>
                          </Avatar>
                        ))}
                      </AvatarGroup>
                    </div>
                  )}
                </button>
              );

              return (
                <div key={reply._id} className="flex flex-col gap-0.5">
                  {itemNode}
                  {!isLast && <Separator className="bg-border/30 my-0.5 shrink-0" />}
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
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
  "box-border min-h-0 w-full max-w-full min-w-0 max-h-48 overflow-x-hidden overflow-y-auto px-4 pt-4 pb-2 wrap-break-word [overflow-wrap:anywhere]";
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
      <PromptInputFooter className={PROMPT_FOOTER_CLASS}>
        <PromptInputTools className="flex items-center gap-1.5">
          {allowImageAttachments && (
            <ChatPromptInputAttachButton disabled={disabled} />
          )}
          <ChatPromptInputQuickRepliesButton
            disabled={disabled}
            onChange={onChange}
            textareaRef={internalTextareaRef}
          />
        </PromptInputTools>
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
