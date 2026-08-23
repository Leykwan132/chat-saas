import type { FormEvent } from "react";
import { MessageScroller } from "@shadcn/react/message-scroller";
import { ArrowUp, MessagesSquare, RotateCcw } from "lucide-react";
import { getVisibleWebWidgetSuggestions } from "../../../shared/webWidgetSuggestions";
import { cn } from "@/lib/utils";
import { formatWidgetMessageTime } from "@/widget/formatWidgetMessageTime";
import { WidgetThinkingIndicator } from "@/widget/WidgetThinkingIndicator";
import { WebWidgetPreviewEmptyState } from "./WebWidgetPreviewEmptyState";

type PreviewMessage = {
  direction: "agent" | "visitor";
  sender: "ai" | "team" | "visitor";
  content: string;
  createdAt: number;
};

type WebWidgetPreviewChatProps = {
  borderClassName: string;
  dark: boolean;
  displayName: string;
  draft: string;
  iconUrl?: string;
  messages: PreviewMessage[];
  placeholder: string;
  suggestions: string[];
  suggestionsEnabled: boolean;
  poweredBy: boolean;
  isThinking: boolean;
  subduedTextClassName: string;
  onDraftChange: (value: string) => void;
  onRequestReset: () => void;
  onSelectSuggestion: (suggestion: string) => void;
  onSend: (event: FormEvent<HTMLFormElement>) => void;
};

export function WebWidgetPreviewChat({
  borderClassName,
  dark,
  displayName,
  draft,
  iconUrl,
  messages,
  placeholder,
  suggestions,
  suggestionsEnabled,
  poweredBy,
  isThinking,
  subduedTextClassName,
  onDraftChange,
  onRequestReset,
  onSelectSuggestion,
  onSend,
}: WebWidgetPreviewChatProps) {
  const contentClassName =
    messages.length === 0
      ? "grid h-full min-h-full place-items-stretch p-0"
      : "grid min-h-full content-end gap-3 p-4";
  const visibleSuggestions = getVisibleWebWidgetSuggestions(
    suggestions,
    suggestionsEnabled,
    messages.length,
  );

  return (
    <div
      className={cn(
        "grid h-full",
        poweredBy ? "grid-rows-[auto_1fr_auto_auto]" : "grid-rows-[auto_1fr_auto]",
      )}
    >
      <header
        className={cn(
          "flex items-center gap-3 border-b px-4 py-4",
          borderClassName,
        )}
      >
        <div className="grid size-8 place-items-center overflow-hidden rounded-full bg-zinc-950 text-white">
          {iconUrl ? (
            <img src={iconUrl} alt="" className="size-full object-cover" />
          ) : (
            <MessagesSquare className="size-4" />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm">{displayName}</p>
        </div>
        <button
          type="button"
          className="ml-auto flex size-8 items-center justify-center rounded-md text-zinc-500 disabled:cursor-not-allowed disabled:opacity-45"
          disabled={messages.length === 0}
          onClick={onRequestReset}
          aria-label="Reset preview chat"
          title="Reset chat"
        >
          <RotateCcw className="size-4" />
        </button>
      </header>
      <MessageScroller.Provider
        autoScroll
        scrollPreviousItemPeek={24}
      >
        <MessageScroller.Root className="relative h-full min-h-0">
          <MessageScroller.Viewport
            aria-label="Preview chat messages"
            className="h-full overflow-y-auto"
          >
            <MessageScroller.Content className={contentClassName}>
              {messages.length === 0 ? (
                <WebWidgetPreviewEmptyState
                  subduedTextClassName={subduedTextClassName}
                />
              ) : null}
              {messages.map((message, index) => (
                <MessageScroller.Item
                  key={`${message.direction}-${index}`}
                  messageId={`${message.direction}-${index}`}
                  scrollAnchor={message.direction === "visitor"}
                  className="grid"
                >
                  <div
                    className={cn(
                      "grid gap-1",
                      message.direction === "visitor"
                        ? "justify-items-end"
                        : "justify-items-start",
                    )}
                  >
                    {message.direction === "agent" ? (
                      <span className={cn("text-xs", subduedTextClassName)}>
                        {message.sender === "team" ? "Your team" : "AI Agent"}
                      </span>
                    ) : null}
                    <p
                      className={cn(
                        "w-fit max-w-[84%] rounded-2xl px-3 py-2 text-sm leading-5",
                        message.direction === "visitor"
                          ? "bg-zinc-950 text-white"
                          : dark
                            ? "bg-zinc-800 text-zinc-100"
                            : "bg-zinc-100 text-zinc-950",
                      )}
                    >
                      {message.content}
                    </p>
                    <time
                      className={cn("text-xs", subduedTextClassName)}
                      dateTime={new Date(message.createdAt).toISOString()}
                    >
                      {formatWidgetMessageTime(message.createdAt)}
                    </time>
                  </div>
                </MessageScroller.Item>
              ))}
              {isThinking ? (
                <MessageScroller.Item messageId="thinking" className="grid">
                  <WidgetThinkingIndicator />
                </MessageScroller.Item>
              ) : null}
            </MessageScroller.Content>
          </MessageScroller.Viewport>
        </MessageScroller.Root>
      </MessageScroller.Provider>
      <div className="grid gap-2">
        {visibleSuggestions.length > 0 ? (
          <div className="flex flex-col items-start gap-2 px-3">
            {visibleSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className={cn(
                  "max-w-full rounded-full border px-3 py-1.5 text-left text-xs",
                  borderClassName,
                )}
                disabled={isThinking}
                onClick={() => onSelectSuggestion(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}
        <form
          className={cn("m-3 grid rounded-2xl border px-3 pb-2 pt-2.5", borderClassName)}
          onSubmit={onSend}
        >
          <textarea
            value={draft}
            disabled={isThinking}
            placeholder={placeholder}
            rows={1}
            className={cn(
              "min-h-[58px] w-full resize-none bg-transparent p-0 text-sm outline-none",
              subduedTextClassName,
            )}
            onChange={(event) => onDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <div className="flex justify-end">
            <button
              type="submit"
              className="flex size-8 items-center justify-center rounded-full bg-blue-500 text-white disabled:opacity-50"
              disabled={isThinking || !draft.trim()}
              aria-label="Send preview message"
            >
              <ArrowUp className="size-4" />
            </button>
          </div>
        </form>
      </div>
      {poweredBy ? (
        <p className={cn("pb-2 text-center text-[11px]", subduedTextClassName)}>
          Powered by{" "}
          <a
            href="https://kilobot.app/"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            Kilobot
          </a>
        </p>
      ) : null}
    </div>
  );
}
