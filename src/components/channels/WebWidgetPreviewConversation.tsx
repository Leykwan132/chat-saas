import { Shimmer } from '@/components/ai-elements/shimmer';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import {
  Message,
  MessageContent,
} from '@/components/ai-elements/message';
import Markdown from 'react-markdown';
import type { Components } from 'react-markdown';
import { cn } from '@/lib/utils';

export type WebWidgetPreviewMessage = {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  contentType: string;
  mediaUrl?: string;
  createdAt: number;
};

type WebWidgetPreviewConversationProps = {
  agentName: string;
  iconUrl?: string;
  loading?: boolean;
  messages: WebWidgetPreviewMessage[];
  sendError?: string | null;
};

const markdownComponents: Components = {
  em: ({ children, ...props }) => <strong {...props}>{children}</strong>,
};
const FALLBACK_WIDGET_ICON_URL = '/icon.svg';

export function WebWidgetPreviewConversation({
  agentName,
  iconUrl,
  loading = false,
  messages,
  sendError = null,
}: WebWidgetPreviewConversationProps) {
  const latestMessage = messages.at(-1);
  const waitingForAi =
    Boolean(latestMessage) &&
    latestMessage?.role === 'user' &&
    !sendError;

  return (
    <Conversation className="min-h-0 min-w-0 flex-1 overflow-hidden bg-transparent">
      <ConversationContent className="gap-3 px-4 pb-4 pt-2">
        {loading ? (
          <div className="flex min-h-24 items-center justify-center">
            <Shimmer duration={2} spread={3} className="text-sm font-medium">
              Loading conversation...
            </Shimmer>
          </div>
        ) : null}
        {messages.map((message) => (
          <Message
            key={message.id}
            from={message.role === 'user' ? 'user' : 'assistant'}
          >
            <MessageContent>
              {message.role === 'assistant' ? (
                <AssistantPreviewMessage
                  agentName={agentName}
                  iconUrl={iconUrl}
                  message={message}
                />
              ) : (
                <div
                  className="ml-auto w-fit max-w-[85%] rounded-lg border border-white/15 bg-white/15 px-3 py-2 text-sm leading-snug text-white shadow-sm sm:max-w-none"
                >
                  <MessagePayload message={message} markdown={false} />
                </div>
              )}
            </MessageContent>
          </Message>
        ))}
        {waitingForAi ? (
          <AssistantThinkingMessage
            agentName={agentName}
            iconUrl={iconUrl}
          />
        ) : null}
        {sendError ? (
          <div className="w-fit rounded-lg border border-red-200/20 bg-red-500/15 px-3 py-2 text-xs leading-snug text-red-50">
            {sendError}
          </div>
        ) : null}
      </ConversationContent>
      <ConversationScrollButton
        className="border-white/20 bg-white text-black hover:bg-white/90"
      />
    </Conversation>
  );
}

function AssistantPreviewMessage({
  agentName,
  iconUrl,
  message,
}: {
  agentName: string;
  iconUrl?: string;
  message: WebWidgetPreviewMessage;
}) {
  return (
    <div className="flex w-fit max-w-[85%] flex-col items-start gap-2 sm:max-w-none">
      <PreviewAssistantAvatar
        iconUrl={iconUrl}
        name={agentName}
      />
      <div className="min-w-0 w-full max-w-full text-sm leading-snug text-white/90">
        <MessagePayload message={message} markdown />
      </div>
    </div>
  );
}

function AssistantThinkingMessage({
  agentName,
  iconUrl,
}: {
  agentName: string;
  iconUrl?: string;
}) {
  return (
    <Message from="assistant">
      <MessageContent>
        <div className="flex w-fit max-w-[85%] flex-col items-start gap-2 sm:max-w-none">
          <PreviewAssistantAvatar
            iconUrl={iconUrl}
            isAnimating
            name={agentName}
          />
          <div className="text-sm font-medium leading-snug">
            <Shimmer duration={2} spread={3}>Thinking...</Shimmer>
          </div>
        </div>
      </MessageContent>
    </Message>
  );
}

function MessagePayload({
  message,
  markdown,
}: {
  message: WebWidgetPreviewMessage;
  markdown: boolean;
}) {
  if (message.mediaUrl) {
    return (
      <a
        href={message.mediaUrl}
        target="_blank"
        rel="noreferrer"
        className="underline underline-offset-2"
      >
        {message.content || message.contentType}
      </a>
    );
  }

  if (!markdown) {
    return <span className="whitespace-pre-wrap">{message.content}</span>;
  }

  return <PreviewMarkdown text={message.content} />;
}

function PreviewMarkdown({ text }: { text: string }) {
  const processed = text.replace(/\n+/g, '\n\n');

  return (
    <div className="[&_p]:leading-snug [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_p:not(:last-child)]:mb-2">
      <Markdown components={markdownComponents}>{processed}</Markdown>
    </div>
  );
}

function PreviewAssistantAvatar({
  iconUrl,
  isAnimating = false,
  name,
}: {
  iconUrl?: string;
  isAnimating?: boolean;
  name: string;
}) {
  const imageUrl = iconUrl || FALLBACK_WIDGET_ICON_URL;
  const iconClassName = cn(
    'size-full scale-[1.12] object-cover',
    !iconUrl && 'dark:invert',
  );

  return (
    <div className="relative size-10 shrink-0 overflow-hidden rounded-full">
      {isAnimating ? (
        <div
          className="absolute inset-0 box-border animate-spin rounded-full"
          style={{
            background:
              'conic-gradient(from 0deg, #3b82f6, #8b5cf6, #ec4899, #3b82f6)',
          }}
        />
      ) : null}
      <div
        className={cn(
          'absolute box-border flex items-center justify-center rounded-full border-2 border-white bg-white dark:border-white dark:bg-white',
          isAnimating ? 'inset-[3px]' : 'inset-0',
        )}
      >
        <div className="size-7 overflow-hidden rounded-full">
          <img src={imageUrl} alt={name} className={iconClassName} />
        </div>
      </div>
    </div>
  );
}
