"use client";

import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  type PromptInputMessage,
  usePromptInputAttachments,
} from "@/components/ai-elements/prompt-input";
import {
  ChatPromptInputAttachButton,
  ChatPromptInputAttachments,
} from "@/components/chat/ChatPromptInputAttachments";
import { ChatPromptInputQuickRepliesButton } from "@/components/chat/ChatPromptInputQuickRepliesButton";
import {
  MediaAttachmentUploadProvider,
  useMediaAttachmentUploads,
} from "@/hooks/useMediaAttachmentUploads";
import {
  isProductFeatureEnabled,
  useShowSavedReplies,
} from "@/lib/posthogFeatureFlags";
import { cn } from "@/lib/utils";
import type { ChatStatus } from "ai";
import {
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

function ChatPromptInputSubmitWithUploadGate(props: {
  allowAttachments?: boolean;
  disabled?: boolean;
  hasText: boolean;
  status?: ChatStatus;
}) {
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
  allowImageAttachments?: boolean;
  enableMediaUpload?: boolean;
};

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
  const savedRepliesState = useShowSavedReplies();
  const showSavedReplies = isProductFeatureEnabled(savedRepliesState);

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
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      autoResizeTextarea(event.currentTarget);
      onChange(event.currentTarget.value);
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
          {showSavedReplies && (
            <ChatPromptInputQuickRepliesButton
              disabled={disabled}
              onChange={onChange}
              resizeTextarea={autoResizeTextarea}
              textareaRef={internalTextareaRef}
            />
          )}
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
          <MediaAttachmentUploadProvider>
            {promptBody}
          </MediaAttachmentUploadProvider>
        ) : (
          promptBody
        )}
      </PromptInput>
    </ChatPromptInputShell>
  );
}
