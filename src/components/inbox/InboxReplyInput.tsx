"use client";

import { ChatPromptInput, type ChatPromptInputProps } from "@/components/ChatPromptInput";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";

export type InboxReplyInputProps = Omit<
  ChatPromptInputProps,
  "allowImageAttachments" | "submitDisabled" | "submitStatus"
> & {
  busy?: boolean;
  onSubmit: (message: PromptInputMessage) => void | Promise<void>;
};

export function InboxReplyInput({
  busy = false,
  disabled = false,
  value,
  ...props
}: InboxReplyInputProps) {
  return (
    <ChatPromptInput
      {...props}
      allowImageAttachments
      enableMediaUpload
      disabled={disabled || busy}
      submitDisabled={disabled || busy}
      submitStatus={busy ? "submitted" : undefined}
      value={value}
    />
  );
}
