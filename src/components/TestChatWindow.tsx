import { useEffect, useState, useRef, useCallback, isValidElement, cloneElement } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Bot, RotateCw, Maximize2 } from 'lucide-react';
import {
  extractMediaKeys,
  stripMediaMarkers,
} from "../../convex/chat/mediaUrlExtractor";
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { useUIMessages, useSmoothText, optimisticallySendMessage } from "@convex-dev/agent/react";
import Markdown from "react-markdown";
import type { Components } from "react-markdown";
import { Button } from '@/components/ui/button';
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { CHAT_SUGGESTIONS } from "@/lib/utils";
import { parseCitations, type Citation } from "@/lib/citation-parser";
import {
  InlineCitation,
  InlineCitationText,
  InlineCitationCard,
  InlineCitationCardTrigger,
  InlineCitationCardBody,
  InlineCitationCarousel,
  InlineCitationCarouselContent,
  InlineCitationCarouselItem,
  InlineCitationCarouselHeader,
  InlineCitationCarouselIndex,
  InlineCitationCarouselPrev,
  InlineCitationCarouselNext,
  InlineCitationSource,
  InlineCitationQuote,
} from "@/components/ai-elements/inline-citation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import { ChatPromptInput } from "@/components/ChatPromptInput";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import {
  Attachment,
  AttachmentOpen,
  AttachmentPreview,
  Attachments,
  getMediaCategory,
} from "@/components/ai-elements/attachments";

function renderCitationBadge(
  citationNumber: string,
  citation: Citation | undefined,
  key: string,
) {
  if (citation && (citation.url || citation.title || citation.description)) {
    return (
      <InlineCitation key={key}>
        <InlineCitationCard>
          <InlineCitationCardTrigger
            sources={citation.url ? [citation.url] : []}
          />
          <InlineCitationCardBody>
            <InlineCitationCarousel>
              <InlineCitationCarouselHeader>
                <InlineCitationCarouselPrev />
                <InlineCitationCarouselNext />
                <InlineCitationCarouselIndex />
              </InlineCitationCarouselHeader>
              <InlineCitationCarouselContent>
                <InlineCitationCarouselItem>
                  <InlineCitationSource
                    title={citation.title}
                    url={citation.url}
                    description={citation.description}
                  />
                  {citation.quote && (
                    <InlineCitationQuote>
                      {citation.quote}
                    </InlineCitationQuote>
                  )}
                </InlineCitationCarouselItem>
              </InlineCitationCarouselContent>
            </InlineCitationCarousel>
          </InlineCitationCardBody>
        </InlineCitationCard>
      </InlineCitation>
    );
  }

  return (
    <InlineCitationText
      key={key}
      className="inline-flex items-center justify-center rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-semibold leading-none text-secondary-foreground align-middle cursor-default"
    >
      {citationNumber}
    </InlineCitationText>
  );
}

let citationInjectKey = 0;

function injectCitations(
  node: React.ReactNode,
  citations: Citation[],
): React.ReactNode {
  if (typeof node === "string") {
    const parts = node.split(/(\[\d+\])/);
    return parts.map((part) => {
      const match = part.match(/\[(\d+)\]/);
      if (match) {
        citationInjectKey += 1;
        const citation = citations.find((c) => c.number === match[1]);
        return renderCitationBadge(match[1], citation, `cit-${citationInjectKey}`);
      }
      return part;
    });
  }

  if (Array.isArray(node)) {
    return node.map((child) => injectCitations(child, citations));
  }

  if (isValidElement(node)) {
    const childProps = node.props as { children?: React.ReactNode };
    if (childProps.children) {
      return cloneElement(node as React.ReactElement<Record<string, unknown>>, {
        ...childProps,
        children: injectCitations(childProps.children, citations),
      });
    }
  }

  return node;
}

function PlaygroundMessageAttachments({
  messageKey,
  items,
}: {
  messageKey: string;
  items: Array<{ url: string; mediaType: string }>;
}) {
  if (items.length === 0) return null;

  return (
    <Attachments className="mt-2 ml-0 mr-auto w-fit justify-start" variant="grid">
      {items.map((item, index) => {
        const file = {
          type: "file" as const,
          url: item.url,
          mediaType: item.mediaType,
          id: `${messageKey}-file-${index}`,
        };
        const isImage =
          getMediaCategory(file) === "image" && Boolean(file.url);

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

function StreamingMarkdown({ text, status }: { text: string; status: string }) {
  const [visibleText] = useSmoothText(text, { startStreaming: status === "streaming" });
  const processed = visibleText.replace(/\n+/g, "\n\n");
  const isLoading = (!text && status === "streaming");

  if (isLoading) {
    return (
      <Shimmer duration={2} spread={3}>
        Thinking…
      </Shimmer>
    );
  }

  const isComplete = status !== "streaming" && status !== "pending";
  const { content: parsedContent, citations } = isComplete
    ? parseCitations(processed)
    : { content: processed, citations: [] as Citation[] };
  const hasCitations = citations.length > 0 && isComplete;

  if (!hasCitations) {
    return (
      <div className="[&_p]:mb-3 [&_p]:leading-relaxed [&_p:first-child]:mt-0">
        <Markdown>{processed}</Markdown>
      </div>
    );
  }

  const markdownComponents: Components = {
    p: ({ children, ...props }) => {
      citationInjectKey = 0;
      const injected = injectCitations(children, citations);
      return <p {...props}>{injected}</p>;
    },
  };

  return (
    <div className="[&_p]:mb-3 [&_p]:leading-relaxed [&_p:first-child]:mt-0">
      <Markdown components={markdownComponents}>
        {parsedContent}
      </Markdown>
    </div>
  );
}

function AnimatedBotIcon({ isAnimating }: { isAnimating: boolean }) {
  return (
    <div className="relative flex size-9 shrink-0 items-center justify-center">
      {isAnimating && (
        <>
          <div
            className="absolute inset-0 rounded-full animate-spin"
            style={{
              background: "conic-gradient(from 0deg, #3b82f6, #8b5cf6, #ec4899, #3b82f6)",
            }}
          />
          <div className="absolute inset-[2px] rounded-full bg-card" />
        </>
      )}
      <Bot className="relative z-10 size-5 text-primary" />
    </div>
  );
}

export function TestChatWindow({
  agentId,
  threadId,
}: {
  agentId: Id<"agents">;
  threadId: string | undefined;
}) {
  const navigate = useNavigate();
  const [, setConversationId] =
    useState<Id<"conversations"> | null>(null);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [expandOpen, setExpandOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const inputDialogRef = useRef<HTMLTextAreaElement>(null);
  const threadInitRef = useRef(false);
  const shouldFocusAfterSend = useRef(false);

  const resetThreadMutation = useMutation(api.chat.streaming.resetThread);
  const sendMessageMutation = useMutation(api.chat.streaming.sendMessage).withOptimisticUpdate((store, args) => {
    optimisticallySendMessage(api.chat.streaming.listThreadMessages)(store, {
      threadId: args.threadId,
      prompt: args.prompt,
    });
  });

  const conversation = useQuery(
    api.chat.streaming.getConversationByThreadId,
    threadId ? { threadId } : "skip",
  );

  const { results: messages, status } = useUIMessages(
    api.chat.streaming.listThreadMessages,
    threadId ? { threadId } : "skip",
    { initialNumItems: 10, stream: true },
  );

  const mediaByClientId = useQuery(
    api.knowledgeBaseImages.listReadyMediaByAgent,
    { agentId },
  ) ?? {};
  const latestPlaygroundThread = useQuery(
    api.chat.streaming.getLatestPlaygroundThread,
    threadId ? "skip" : { agentId }
  );

  useEffect(() => {
    if (conversation) {
      setConversationId(conversation._id);
    }
  }, [conversation]);

  useEffect(() => {
    if (threadId) {
      threadInitRef.current = true;
      return;
    }

    if (latestPlaygroundThread === undefined) return;

    if (threadInitRef.current) return;
    threadInitRef.current = true;

    if (latestPlaygroundThread !== null) {
      setConversationId(latestPlaygroundThread.conversationId);
      navigate(`/dashboard/${agentId}/playground/${latestPlaygroundThread.threadId}`, { replace: true });
    } else {
      resetThreadMutation({ agentId }).then(({ threadId: newThreadId, conversationId }) => {
        setConversationId(conversationId);
        navigate(`/dashboard/${agentId}/playground/${newThreadId}`, { replace: true });
      });
    }
  }, [agentId, threadId, latestPlaygroundThread, resetThreadMutation, navigate]);

  useEffect(() => {
    if (!isSending && shouldFocusAfterSend.current) {
      inputRef.current?.focus();
      inputDialogRef.current?.focus();
      shouldFocusAfterSend.current = false;
    }
  }, [isSending]);

  const handleSend = useCallback(async (promptText?: string) => {
    const prompt = (promptText ?? input).trim();
    if (!prompt || !threadId || isSending) return;
    setInput("");
    setIsSending(true);
    shouldFocusAfterSend.current = true;
    try {
      await sendMessageMutation({ threadId, agentId, prompt, enableCitations: true });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to send message';
      toast.error(message);
    } finally {
      setIsSending(false);
    }
  }, [input, threadId, isSending, agentId, sendMessageMutation]);

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setInput(suggestion);
  }, []);

  const handleSubmit = useCallback(
    (message: PromptInputMessage) => {
      handleSend(message.text);
    },
    [handleSend]
  );

  const handleReset = () => {
    if (!threadId) return;
    setResetDialogOpen(true);
  };

  const handleResetConfirm = async () => {
    if (!threadId) return;
    setResetDialogOpen(false);
    const { threadId: newThreadId, conversationId: newConversationId } =
      await resetThreadMutation({ agentId, existingThreadId: threadId });
    setConversationId(newConversationId);
    navigate(`/dashboard/${agentId}/playground/${newThreadId}`, { replace: true });
  };

  const isConversationLoading = !threadId || status === "LoadingFirstPage";

  const renderMessages = () => {
    if (isConversationLoading) {
      return (
        <ConversationContent>
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
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState
              title="Chat with your agent"
              description="Send a message to test your agent."
            />
          ) : (
            messages.map((message) => {
              const rawText = message.text ?? "";
              const displayText =
                message.role === "user" ? rawText : stripMediaMarkers(rawText);
              const mediaItems =
                message.role === "user"
                  ? []
                  : extractMediaKeys(rawText)
                      .map((clientId) => mediaByClientId[clientId])
                      .filter(
                        (item): item is { url: string; mediaType: string } =>
                          item !== undefined,
                      );

              return (
              // @ts-ignore
              <Message from={message.role} key={message.key}>
                <MessageContent>
                  {message.role !== "user" ? (
                    <div className="flex items-start gap-2">
                      <AnimatedBotIcon
                        isAnimating={
                          message.status === "streaming" ||
                          message.status === "pending"
                        }
                      />
                      <MessageResponse>
                        <StreamingMarkdown
                          text={displayText}
                          status={message.status}
                        />
                        <PlaygroundMessageAttachments
                          messageKey={message.key}
                          items={mediaItems}
                        />
                      </MessageResponse>
                    </div>
                  ) : (
                    <div className=" rounded-lg bg-blue-50 dark:bg-blue-950/40 px-3 py-2 text-base text-blue-950 dark:text-blue-200 ml-auto">
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
                <div className="flex items-start gap-2">
                  <AnimatedBotIcon isAnimating={true} />
                  <div className="pt-1">
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
  };

  const renderInput = (ref: React.RefObject<HTMLTextAreaElement | null>) => (
    <div className="w-full min-w-0 max-w-full shrink-0 overflow-hidden border-t border-border p-4">
      {messages.length === 0 && (
        <div className="pb-4">
          <Suggestions>
            {CHAT_SUGGESTIONS.map((s) => (
              <Suggestion key={s} suggestion={s} onClick={handleSuggestionClick} />
            ))}
          </Suggestions>
        </div>
      )}
      <ChatPromptInput
        containerClassName="w-full max-w-full"
        disabled={isSending}
        onChange={setInput}
        onSubmit={handleSubmit}
        placeholder="Type a message..."
        submitDisabled={isSending}
        submitStatus={isSending ? "submitted" : undefined}
        textareaRef={ref}
        value={input}
      />
    </div>
  );

  return (
    <>
      <div className="w-full min-w-0 max-w-full">
        <div className="flex h-[694px] w-full min-w-0 max-w-full flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm mt-4">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Test your agent</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setExpandOpen(true)}
                disabled={!threadId}
                title="Expand"
              >
                <Maximize2 className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={handleReset}
                disabled={!threadId}
                title="Reset conversation"
              >
                <RotateCw className="size-4" />
              </Button>
            </div>
          </div>

          <Conversation className="min-h-0 min-w-0 flex-1 overflow-hidden">
            {renderMessages()}
          </Conversation>

          {renderInput(inputRef)}
        </div>
      </div>

      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset conversation</DialogTitle>
            <DialogDescription>
              This will delete all messages and start a fresh thread.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setResetDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleResetConfirm()}
            >
              Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={expandOpen} onOpenChange={setExpandOpen}>
        <DialogContent
          className="flex h-[90vh] min-w-0 w-[85vw] max-w-[85vw] flex-col gap-0 overflow-hidden p-0"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
            <DialogTitle className="text-sm font-semibold">
              Test your agent
            </DialogTitle>
          </div>
          <Conversation className="min-h-0 min-w-0 flex-1 overflow-hidden">
            {renderMessages()}
          </Conversation>
          {messages.length === 0 && (
            <div className="px-4 pt-3">
              <Suggestions>
                {CHAT_SUGGESTIONS.map((s) => (
                  <Suggestion key={s} suggestion={s} onClick={handleSuggestionClick} />
                ))}
              </Suggestions>
            </div>
          )}
          {renderInput(inputDialogRef)}
        </DialogContent>
      </Dialog>
    </>
  );
}
