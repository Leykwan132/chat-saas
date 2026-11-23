import { useEffect, useState, useRef, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  useUIMessages,
  optimisticallySendMessage,
} from "@convex-dev/agent/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";

export function usePlaygroundChat({
  agentId,
  threadId,
  onThreadIdChange,
}: {
  agentId: Id<"agents">;
  threadId: string | undefined;
  onThreadIdChange?: (threadId: string) => void;
}) {
  const setActiveThread = useCallback(
    (nextThreadId: string) => {
      onThreadIdChange?.(nextThreadId);
    },
    [onThreadIdChange],
  );
  const [, setConversationId] = useState<Id<"conversations"> | null>(null);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const threadInitRef = useRef(false);
  const shouldFocusAfterSend = useRef(false);

  const resetThreadMutation = useMutation(api.chat.streaming.resetThread);
  const sendMessageMutation = useMutation(
    api.chat.streaming.sendMessage,
  ).withOptimisticUpdate((store, args) => {
    optimisticallySendMessage(api.chat.streaming.listThreadMessages)(store, {
      threadId: args.threadId,
      prompt: args.prompt,
    });
  });

  const conversation = useQuery(
    api.chat.streaming.getConversationByThreadId,
    threadId ? { threadId } : "skip",
  );

  const {
    results: messages,
    status,
    loadMore,
  } = useUIMessages(
    api.chat.streaming.listThreadMessages,
    threadId ? { threadId } : "skip",
    { initialNumItems: 10, stream: true },
  );

  const mediaByClientId =
    useQuery(api.knowledgeBaseImages.listReadyMediaByAgent, { agentId }) ?? {};
  const latestPlaygroundThread = useQuery(
    api.chat.streaming.getLatestPlaygroundThread,
    threadId ? "skip" : { agentId },
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
      resetThreadMutation({ agentId }).then(
        ({ threadId: newThreadId, conversationId }) => {
          setConversationId(conversationId);
          setActiveThread(newThreadId);
        },
      );
    }
  }, [
    agentId,
    threadId,
    latestPlaygroundThread,
    resetThreadMutation,
    setActiveThread,
  ]);

  useEffect(() => {
    if (!isSending && shouldFocusAfterSend.current) {
      inputRef.current?.focus();
      shouldFocusAfterSend.current = false;
    }
  }, [isSending]);

  const handleSend = useCallback(
    async (promptText?: string) => {
      const prompt = (promptText ?? input).trim();
      if (!prompt || !threadId || isSending) return;
      setInput("");
      setIsSending(true);
      shouldFocusAfterSend.current = true;
      try {
        await sendMessageMutation({
          threadId,
          agentId,
          prompt,
          enableCitations: true,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unable to send message";
        toast.error(message);
      } finally {
        setIsSending(false);
      }
    },
    [input, threadId, isSending, agentId, sendMessageMutation],
  );

  const handleSubmit = useCallback(
    (message: PromptInputMessage) => {
      handleSend(message.text);
    },
    [handleSend],
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

  return {
    input,
    setInput,
    isSending,
    resetDialogOpen,
    setResetDialogOpen,
    inputRef,
    messages,
    status,
    loadMore,
    mediaByClientId,
    handleSubmit,
    handleReset,
    handleResetConfirm,
  };
}
