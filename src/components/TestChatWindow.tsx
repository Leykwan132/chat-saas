import { useEffect, useState, useRef, useCallback } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { BadgeCheck, RotateCw, RefreshCw, Maximize2 } from 'lucide-react';
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
import { Spinner } from '@/components/ui/spinner';
import {
  parseCitations,
  stripInlineCitationMarkers,
  type Citation,
} from "@/lib/citation-parser";
import {
  InlineCitation,
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
} from "@/components/ai-elements/message";
import { ChatPromptInput } from "@/components/ChatPromptInput";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { playgroundAssistantTextParts } from "@/lib/playgroundMessageParts";
import {
  Attachment,
  AttachmentOpen,
  AttachmentPreview,
  Attachments,
  getMediaCategory,
} from "@/components/ai-elements/attachments";

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

const whatsAppMarkdownComponents: Components = {
  em: ({ children, ...props }) => <strong {...props}>{children}</strong>,
};

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
    : {
        content: stripInlineCitationMarkers(processed),
        citations: [] as Citation[],
      };
  const hasCitations = citations.length > 0 && isComplete;

  return (
    <div className="[&_p]:leading-snug [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_p:not(:last-child)]:mb-2">
      <Markdown components={whatsAppMarkdownComponents}>{parsedContent}</Markdown>
      {hasCitations ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {citations.map((citation) => (
            <InlineCitation key={`source-${citation.number}-${citation.url ?? citation.title}`}>
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
          ))}
        </div>
      ) : null}
    </div>
  );
}

function AnimatedBotIcon({
  isAnimating,
  className,
}: {
  isAnimating: boolean;
  className?: string;
}) {
  const iconClassName =
    'size-full scale-[1.12] object-cover dark:invert';

  return (
    <div className={cn('relative size-10 shrink-0', className)}>
      {isAnimating ? (
        <div
          className="absolute inset-0 animate-spin rounded-full p-[3px]"
          style={{
            background:
              'conic-gradient(from 0deg, #3b82f6, #8b5cf6, #ec4899, #3b82f6)',
          }}
        />
      ) : null}
      <div
        className={cn(
          'absolute flex items-center justify-center rounded-full border-2 border-white bg-white dark:border-white dark:bg-white',
          isAnimating ? 'inset-[3px]' : 'inset-0',
        )}
      >
        <div className="size-7 overflow-hidden rounded-full">
          <img
            src="/icon.svg"
            alt=""
            className={iconClassName}
          />
        </div>
      </div>
    </div>
  );
}

type PlaygroundTrainingStatus = 'loading' | 'ready' | 'indexing';

function getPlaygroundTrainingStatus(
  isCheckingStatus: boolean,
  indexingStatus:
    | { isIndexing: boolean; queued: number; running: number }
    | null
    | undefined,
): PlaygroundTrainingStatus {
  if (isCheckingStatus || indexingStatus === null || indexingStatus === undefined) {
    return 'loading';
  }
  if (indexingStatus.isIndexing) {
    return 'indexing';
  }
  return 'ready';
}

const PLAYGROUND_TRAINING_STATUS_CONFIG: Record<
  Exclude<PlaygroundTrainingStatus, 'loading'>,
  { bgClass: string; borderClass: string }
> = {
  ready: {
    bgClass: 'bg-emerald-800 dark:bg-emerald-900',
    borderClass: 'border-emerald-700/50 dark:border-emerald-800/50',
  },
  indexing: {
    bgClass: 'bg-amber-700 dark:bg-amber-850',
    borderClass: 'border-amber-600/50 dark:border-amber-750/50',
  },
};

function getUpdatingLabel(indexingStatus: { queued: number; running: number }) {
  const { running, queued } = indexingStatus;
  if (running > 0) {
    return running === 1 ? 'Training 1 item…' : `Training ${running} items…`;
  }
  return queued === 1 ? '1 item in queue…' : `${queued} items in queue…`;
}

function PlaygroundTrainingStatusBanner({
  indexingStatus,
  isCheckingStatus,
  onCheckStatus,
}: {
  indexingStatus:
    | { isIndexing: boolean; queued: number; running: number }
    | null
    | undefined;
  isCheckingStatus: boolean;
  onCheckStatus: () => void;
}) {
  const status = getPlaygroundTrainingStatus(isCheckingStatus, indexingStatus);
  const coloredConfig =
    status === 'loading' ? null : PLAYGROUND_TRAINING_STATUS_CONFIG[status];

  const label =
    status === 'loading'
      ? 'Checking status…'
      : status === 'indexing'
        ? getUpdatingLabel(indexingStatus!)
        : 'Your agent is ready.';

  return (
    <div
      className={cn(
        'flex items-center gap-2 border-b px-4 py-2 text-xs transition-colors',
        status === 'loading'
          ? 'border-border bg-muted/30'
          : cn(coloredConfig!.bgClass, coloredConfig!.borderClass),
      )}
    >
      {status === 'loading' || status === 'indexing' ? (
        <Spinner
          className={cn(
            'size-3.5 shrink-0',
            status === 'loading' ? 'text-muted-foreground' : 'text-white/80',
          )}
        />
      ) : (
        <BadgeCheck className="size-3.5 shrink-0 text-white/80" />
      )}

      <span
        className={cn(
          'min-w-0',
          status === 'loading' ? 'text-muted-foreground' : 'font-semibold text-white',
        )}
      >
        {label}
      </span>

      <div className="ml-auto flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onCheckStatus}
          disabled={isCheckingStatus}
          className={cn(
            'inline-flex size-6 items-center justify-center rounded-md transition-colors disabled:opacity-50',
            status === 'loading'
              ? 'text-muted-foreground hover:text-foreground'
              : 'text-white/60 hover:text-white',
          )}
          title="Refresh training status"
          aria-label="Refresh training status"
        >
          <RefreshCw className={cn('size-3', isCheckingStatus && 'animate-spin')} />
        </button>
      </div>
    </div>
  );
}

const PLAYGROUND_PROMPT_SHELL_CLASS =
  'rounded-2xl border border-border bg-input/50 focus-within:border-ring overflow-hidden [&_[data-slot=input-group]]:bg-transparent [&_[data-slot=input-group]]:border-none [&_[data-slot=input-group]]:shadow-none [&_[data-slot=input-group]]:ring-0';

const PLAYGROUND_MESSAGE_TEXT_CLASS = 'text-sm leading-snug';

const PLAYGROUND_CONVERSATION_CONTENT_CLASS = 'gap-5 p-5';

const PLAYGROUND_ASSISTANT_ROW_CLASS =
  'flex w-fit max-w-[85%] flex-col items-start gap-2 sm:max-w-none';

const PLAYGROUND_BUBBLE_SHELL_CLASS = 'rounded-lg border border-border px-3 py-2';

const PLAYGROUND_ASSISTANT_BUBBLE_CLASS =
  cn(
    PLAYGROUND_MESSAGE_TEXT_CLASS,
    'min-w-0 w-full max-w-full text-foreground',
  );

const PLAYGROUND_USER_BUBBLE_CLASS =
  cn(
    PLAYGROUND_MESSAGE_TEXT_CLASS,
    PLAYGROUND_BUBBLE_SHELL_CLASS,
    'ml-auto w-fit max-w-[85%] bg-blue-50 text-blue-950 dark:bg-blue-950/40 dark:text-blue-200 sm:max-w-none',
  );

export function TestChatWindow({
  agentId,
  threadId,
  agentName,
  embedded = false,
  fillContainer = false,
  onThreadIdChange,
  indexingStatus,
  isCheckingStatus,
  onCheckStatus,
}: {
  agentId: Id<"agents">;
  threadId: string | undefined;
  agentName?: string;
  embedded?: boolean;
  fillContainer?: boolean;
  onThreadIdChange?: (threadId: string) => void;
  indexingStatus?: { isIndexing: boolean; queued: number; running: number } | null;
  isCheckingStatus?: boolean;
  onCheckStatus?: () => void;
}) {
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

  const setActiveThread = useCallback(
    (nextThreadId: string) => {
      onThreadIdChange?.(nextThreadId);
    },
    [onThreadIdChange],
  );
  const [, setConversationId] =
    useState<Id<"conversations"> | null>(null);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
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
      setActiveThread(latestPlaygroundThread.threadId);
    } else {
      resetThreadMutation({ agentId }).then(({ threadId: newThreadId, conversationId }) => {
        setConversationId(conversationId);
        setActiveThread(newThreadId);
      });
    }
  }, [agentId, threadId, latestPlaygroundThread, resetThreadMutation, setActiveThread]);

  useEffect(() => {
    if (!isSending && shouldFocusAfterSend.current) {
      inputRef.current?.focus();
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
    setActiveThread(newThreadId);
  };

  const isConversationLoading = !threadId || status === "LoadingFirstPage";
  const displayName = agentName?.trim() || "your agent";

  const renderMessages = () => {
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

              return (
              // @ts-ignore
              <Message from={message.role} key={message.key}>
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
                      <div className={cn(PLAYGROUND_ASSISTANT_BUBBLE_CLASS, "space-y-3")}>
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
                      </div>
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
  };

  const renderInput = (ref: React.RefObject<HTMLTextAreaElement | null>) => (
    <div className="w-full min-w-0 max-w-full shrink-0 overflow-hidden border-t border-border p-4">
      <div className={PLAYGROUND_PROMPT_SHELL_CLASS}>
        {onCheckStatus ? (
          <PlaygroundTrainingStatusBanner
            indexingStatus={indexingStatus}
            isCheckingStatus={isCheckingStatus ?? false}
            onCheckStatus={onCheckStatus}
          />
        ) : null}
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
          allowImageAttachments
          enableMediaUpload
        />
      </div>
    </div>
  );

  return (
    <>
      <div className={cn('w-full min-w-0 max-w-full', fillContainer && 'h-full')}>
        <div
          className={cn(
            'flex w-full min-w-0 max-w-full flex-col overflow-hidden',
            !fillContainer && 'rounded-lg border border-border bg-card shadow-sm',
            fillContainer
              ? 'mt-0 h-full min-h-0 bg-card'
              : embedded
                ? 'h-[min(744px,calc(100vh-10rem))] min-h-[541px]'
                : 'mt-4 h-[calc(100vh-220px)] min-h-[600px]',
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-semibold truncate max-w-[150px] sm:max-w-[280px]">
              {agentName?.trim() || "Test your agent"}
            </span>

            <div className="flex items-center gap-1">
              {embedded ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setFullscreenOpen(true)}
                  title="Open full playground"
                  aria-label="Open full playground"
                >
                  <Maximize2 className="size-4" />
                </Button>
              ) : null}
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

      {embedded ? (
        <Dialog open={fullscreenOpen} onOpenChange={setFullscreenOpen}>
          <DialogContent
            overlayClassName="bg-black/55 supports-backdrop-filter:backdrop-blur-md"
            className="flex h-[min(92vh,960px)] w-full max-w-[min(calc(100%-2rem),70rem)] flex-col gap-0 overflow-hidden rounded-lg border border-border bg-card p-0 shadow-sm sm:max-w-[min(calc(100%-2rem),70rem)]"
          >
            <DialogHeader className="sr-only">
              <DialogTitle>Playground</DialogTitle>
              <DialogDescription>Test your agent in an expanded window</DialogDescription>
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-hidden">
              <TestChatWindow
                agentId={agentId}
                agentName={agentName}
                threadId={threadId}
                fillContainer
                onThreadIdChange={onThreadIdChange}
                indexingStatus={indexingStatus}
                isCheckingStatus={isCheckingStatus}
                onCheckStatus={onCheckStatus}
              />
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}
