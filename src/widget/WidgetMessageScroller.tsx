import { MessageScroller } from "@shadcn/react/message-scroller";
import { formatWidgetMessageTime } from "./formatWidgetMessageTime";
import type { WidgetMessage } from "./types";
import { WidgetEmptyState } from "./WidgetEmptyState";
import { WidgetThinkingIndicator } from "./WidgetThinkingIndicator";

type WidgetMessageScrollerProps = {
  isThinking?: boolean;
  messages: WidgetMessage[];
};

export function WidgetMessageScroller({
  isThinking = false,
  messages,
}: WidgetMessageScrollerProps) {
  const isEmpty = messages.length === 0;

  return (
    <MessageScroller.Provider
      autoScroll
      scrollPreviousItemPeek={24}
    >
      <MessageScroller.Root className="messages">
        <MessageScroller.Viewport
          aria-label="Chat messages"
          className="messages-viewport"
        >
          <MessageScroller.Content
            className={`messages-content${isEmpty ? " is-empty" : ""}`}
          >
            {isEmpty ? <WidgetEmptyState /> : null}
            {messages.map((message) => {
              const sender =
                message.sender === "team" ? message.senderName : "AI Agent";

              return (
                <MessageScroller.Item
                  key={message.id}
                  messageId={message.id}
                  scrollAnchor={message.direction === "incoming"}
                >
                  <div className={`message-row ${message.direction}`}>
                    {message.direction === "outgoing" && sender ? (
                      <span className="message-sender">{sender}</span>
                    ) : null}
                    <p className={message.direction}>{message.content}</p>
                    <time
                      className="message-time"
                      dateTime={new Date(message.createdAt).toISOString()}
                    >
                      {formatWidgetMessageTime(message.createdAt)}
                    </time>
                  </div>
                </MessageScroller.Item>
              );
            })}
            {isThinking ? (
              <MessageScroller.Item messageId="thinking" className="grid">
                <WidgetThinkingIndicator />
              </MessageScroller.Item>
            ) : null}
          </MessageScroller.Content>
        </MessageScroller.Viewport>
      </MessageScroller.Root>
    </MessageScroller.Provider>
  );
}
