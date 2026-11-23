import type { UIMessage } from "@convex-dev/agent/react";
import { cn } from "@/lib/utils";
import {
  extractMediaKeys,
  stripMediaMarkers,
} from "../../convex/chat/mediaUrlExtractor";
import {
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { playgroundAssistantTextParts } from "@/lib/playgroundMessageParts";
import { hideSystemErrorText } from "@/lib/systemErrorText";
import { PlaygroundAssistantResponse } from "./PlaygroundAssistantResponse";
import { StreamingMarkdown } from "./PlaygroundStreamingMarkdown";
import {
  AnimatedBotIcon,
  PlaygroundMessageAttachments,
  PLAYGROUND_CONVERSATION_CONTENT_CLASS,
  PLAYGROUND_ASSISTANT_ROW_CLASS,
  PLAYGROUND_ASSISTANT_BUBBLE_CLASS,
  PLAYGROUND_USER_BUBBLE_CLASS,
  type ExpandedAssistantResponse,
} from "./playgroundPresentation";

export function PlaygroundThreadMessages({
  isConversationLoading,
  displayName,
  messages,
  status,
  mediaByClientId,
  setExpandedResponse,
}: {
  isConversationLoading: boolean;
  displayName: string;
  messages: UIMessage[];
  status: string;
  mediaByClientId: Record<string, { url: string; mediaType: string }>;
  setExpandedResponse: (response: ExpandedAssistantResponse) => void;
}) {
  if (isConversationLoading) {
    return (
      <ConversationContent className={PLAYGROUND_CONVERSATION_CONTENT_CLASS}>
        <div className="flex size-full min-h-[400px] flex-col items-center justify-center gap-3 text-center">
          <Shimmer duration={2} spread={3} className="text-sm font-medium">
            Loading Conversations...
          </Shimmer>
        </div>
      </ConversationContent>
    );
  }

  return (
    <>
      <ConversationContent className={PLAYGROUND_CONVERSATION_CONTENT_CLASS}>
        {messages.length === 0 ? (
          <ConversationEmptyState
            title={`Chat with ${displayName}`}
            description={`Send a message to test ${displayName}.`}
          />
        ) : (
          messages.map((message) => {
            const rawText = message.text ?? "";
            const displayText =
              message.role === "user" ? rawText : stripMediaMarkers(rawText);
            const assistantTexts =
              message.role === "user"
                ? []
                : playgroundAssistantTextParts(message)
                    .map(stripMediaMarkers)
                    .map(hideSystemErrorText)
                    .filter(Boolean);
            const mediaItems =
              message.role === "user"
                ? []
                : extractMediaKeys(rawText)
                    .map((clientId) => mediaByClientId[clientId])
                    .filter(
                      (item): item is { url: string; mediaType: string } =>
                        item !== undefined,
                    );
            const isResponseExpandable =
              message.status !== "streaming" && message.status !== "pending";

            return (
              <Message
                from={message.role === "user" ? "user" : "assistant"}
                key={message.key}
              >
                <MessageContent>
                  {message.role !== "user" ? (
                    <div className={PLAYGROUND_ASSISTANT_ROW_CLASS}>
                      <AnimatedBotIcon
                        className="shrink-0"
                        isAnimating={
                          message.status === "streaming" ||
                          message.status === "pending"
                        }
                      />
                      <PlaygroundAssistantResponse
                        className={cn(
                          PLAYGROUND_ASSISTANT_BUBBLE_CLASS,
                          "space-y-3",
                        )}
                        expandable={isResponseExpandable}
                        onExpand={() =>
                          setExpandedResponse({
                            key: message.key,
                            mediaItems,
                            status: message.status,
                            textParts: assistantTexts,
                          })
                        }
                      >
                        {assistantTexts.map((text, index) => (
                          <StreamingMarkdown
                            key={`${message.key}-part-${index}`}
                            text={text}
                            status={message.status}
                          />
                        ))}
                        <PlaygroundMessageAttachments
                          messageKey={message.key}
                          items={mediaItems}
                        />
                      </PlaygroundAssistantResponse>
                    </div>
                  ) : (
                    <div className={PLAYGROUND_USER_BUBBLE_CLASS}>
                      {displayText}
                    </div>
                  )}
                </MessageContent>
              </Message>
            );
          })
        )}
        {status === "LoadingMore" && messages.length > 0 && (
          <Message from="assistant">
            <MessageContent>
              <div className={PLAYGROUND_ASSISTANT_ROW_CLASS}>
                <AnimatedBotIcon className="shrink-0" isAnimating={true} />
                <div className={PLAYGROUND_ASSISTANT_BUBBLE_CLASS}>
                  <Shimmer duration={3} spread={3}>
                    Slower shimmer with wider spread
                  </Shimmer>
                </div>
              </div>
            </MessageContent>
          </Message>
        )}
      </ConversationContent>
      <ConversationScrollButton />
    </>
  );
}
