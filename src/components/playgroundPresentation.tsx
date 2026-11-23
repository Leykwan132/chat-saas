import { cn } from "@/lib/utils";
import {
  Attachment,
  AttachmentOpen,
  AttachmentPreview,
  Attachments,
  getMediaCategory,
} from "@/components/ai-elements/attachments";

export function PlaygroundMessageAttachments({
  messageKey,
  items,
}: {
  messageKey: string;
  items: Array<{ url: string; mediaType: string }>;
}) {
  if (items.length === 0) return null;

  return (
    <Attachments
      className="mt-2 ml-0 mr-auto w-fit justify-start"
      variant="grid"
    >
      {items.map((item, index) => {
        const file = {
          type: "file" as const,
          url: item.url,
          mediaType: item.mediaType,
          id: `${messageKey}-file-${index}`,
        };
        const isImage = getMediaCategory(file) === "image" && Boolean(file.url);

        return (
          <Attachment
            className={isImage ? "size-40 p-0 overflow-hidden" : undefined}
            data={file}
            key={file.id}
          >
            <AttachmentPreview />
            {isImage ? <AttachmentOpen /> : null}
          </Attachment>
        );
      })}
    </Attachments>
  );
}

export function AnimatedBotIcon({
  isAnimating,
  className,
}: {
  isAnimating: boolean;
  className?: string;
}) {
  const iconClassName = "size-full scale-[1.12] object-cover dark:invert";

  return (
    <div className={cn("relative size-10 shrink-0", className)}>
      {isAnimating ? (
        <div
          className="absolute inset-0 animate-spin rounded-full p-[3px]"
          style={{
            background:
              "conic-gradient(from 0deg, #3b82f6, #8b5cf6, #ec4899, #3b82f6)",
          }}
        />
      ) : null}
      <div
        className={cn(
          "absolute flex items-center justify-center rounded-full border-2 border-white bg-white dark:border-white dark:bg-white",
          isAnimating ? "inset-[3px]" : "inset-0",
        )}
      >
        <div className="size-7 overflow-hidden rounded-full">
          <img src="/icon.svg" alt="" className={iconClassName} />
        </div>
      </div>
    </div>
  );
}

export const PLAYGROUND_PROMPT_SHELL_CLASS =
  "rounded-2xl border border-border bg-input/50 focus-within:border-ring overflow-hidden [&_[data-slot=input-group]]:bg-transparent [&_[data-slot=input-group]]:border-none [&_[data-slot=input-group]]:shadow-none [&_[data-slot=input-group]]:ring-0";

export const PLAYGROUND_MESSAGE_TEXT_CLASS = "text-sm leading-snug";

export const PLAYGROUND_CONVERSATION_CONTENT_CLASS = "gap-5 p-5";

export const PLAYGROUND_ASSISTANT_ROW_CLASS =
  "flex w-fit max-w-[85%] flex-col items-start gap-2 sm:max-w-none";

export const PLAYGROUND_BUBBLE_SHELL_CLASS =
  "rounded-lg border border-border px-3 py-2";

export const PLAYGROUND_ASSISTANT_BUBBLE_CLASS = cn(
  PLAYGROUND_MESSAGE_TEXT_CLASS,
  "min-w-0 w-full max-w-full text-foreground",
);

export const PLAYGROUND_USER_BUBBLE_CLASS = cn(
  PLAYGROUND_MESSAGE_TEXT_CLASS,
  PLAYGROUND_BUBBLE_SHELL_CLASS,
  "ml-auto w-fit max-w-[85%] bg-blue-50 text-blue-950 dark:bg-blue-950/40 dark:text-blue-200 sm:max-w-none",
);

export type ExpandedAssistantResponse = {
  key: string;
  mediaItems: Array<{ url: string; mediaType: string }>;
  status: string;
  textParts: string[];
};
