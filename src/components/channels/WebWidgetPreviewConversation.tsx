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
import type { CSSProperties } from 'react';
import { motion } from 'motion/react';
import { MessagePayload } from './WebWidgetPreviewMessagePayload';

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

export function WebWidgetPreviewConversation({
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
      <ConversationContent className="gap-4 px-4 pb-4 pt-2">
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
                  message={message}
                />
              ) : (
                <div
                  className="ml-auto w-fit max-w-[85%] rounded-2xl bg-[#3f403c] px-3 py-2 text-sm leading-snug text-white sm:max-w-none"
                >
                  <MessagePayload message={message} markdown={false} />
                </div>
              )}
            </MessageContent>
          </Message>
        ))}
        {waitingForAi ? (
          <AssistantThinkingMessage />
        ) : null}
        {sendError ? (
          <div className="w-fit rounded-lg border border-red-200/20 bg-red-500/15 px-3 py-2 text-xs leading-snug text-red-50">
            {sendError}
          </div>
        ) : null}
      </ConversationContent>
      <ConversationScrollButton
        aria-label="Scroll to latest message"
        className="bottom-5 size-8 border-0 bg-white text-neutral-900 shadow-md hover:bg-white/95"
      />
    </Conversation>
  );
}

function AssistantPreviewMessage({
  message,
}: {
  message: WebWidgetPreviewMessage;
}) {
  return (
    <div className="flex w-fit max-w-[85%] flex-col items-start gap-2 sm:max-w-none">
      <div className="min-w-0 w-full max-w-full text-sm leading-snug text-white/90">
        <MessagePayload message={message} markdown />
      </div>
    </div>
  );
}

function AssistantThinkingMessage() {
  return (
    <Message from="assistant">
      <MessageContent>
        <div className="flex w-fit max-w-[85%] flex-col items-start sm:max-w-none">
          <ThinkingShimmerText>Thinking...</ThinkingShimmerText>
        </div>
      </MessageContent>
    </Message>
  );
}

function ThinkingShimmerText({ children }: { children: string }) {
  return (
    <motion.span
      animate={{ backgroundPosition: '-200% 0' }}
      className="inline-block bg-clip-text text-sm font-medium leading-snug text-transparent"
      initial={{ backgroundPosition: '200% 0' }}
      style={{
        backgroundImage:
          'linear-gradient(135deg, #ffffff, #5E5E5E, #ffffff)',
        backgroundSize: '200% 100%',
      } satisfies CSSProperties}
      transition={{
        duration: 5,
        ease: 'linear',
        repeat: Number.POSITIVE_INFINITY,
      }}
    >
      {children}
    </motion.span>
  );
}
