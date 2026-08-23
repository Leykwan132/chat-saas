import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { WidgetInit } from "./protocol";
import type { WidgetMessage } from "./types";
import { endpoint, json } from "./widgetHttp";

const POLL_INTERVAL_MS = 750;
const ACTIVE_CHAT_POLL_INTERVAL_MS = 2_000;

export function useWidgetReplyPolling(
  init: WidgetInit | null,
  setMessages: Dispatch<SetStateAction<WidgetMessage[]>>,
  isChatOpen: boolean,
) {
  const [isThinking, setIsThinking] = useState(false);
  const pollingIdRef = useRef(0);
  const timeoutRef = useRef<number | undefined>(undefined);

  const stopThinking = useCallback(() => {
    pollingIdRef.current += 1;
    if (timeoutRef.current !== undefined) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
    setIsThinking(false);
  }, []);

  const refreshMessages = useCallback(async () => {
    if (!init) return [];
    const result = await json<{ messages: WidgetMessage[] }>(
      endpoint(init, "/widget/messages", {
        key: init.publicKey,
        visitorId: init.visitorId,
      }),
    );
    setMessages(result.messages);
    return result.messages;
  }, [init, setMessages]);

  const startThinking = useCallback(
    (sentAt: number) => {
      if (!init) return;
      stopThinking();
      const pollingId = pollingIdRef.current + 1;
      pollingIdRef.current = pollingId;
      setIsThinking(true);

      const poll = async () => {
        try {
          const messages = await refreshMessages();
          if (pollingIdRef.current !== pollingId) return;
          if (
            messages.some(
              (message) =>
                message.direction === "outgoing" && message.createdAt >= sentAt,
            )
          ) {
            setIsThinking(false);
            return;
          }
          timeoutRef.current = window.setTimeout(
            () => void poll(),
            POLL_INTERVAL_MS,
          );
        } catch {
          if (pollingIdRef.current === pollingId) setIsThinking(false);
        }
      };

      void poll();
    },
    [init, refreshMessages, stopThinking],
  );

  useEffect(() => stopThinking, [init, stopThinking]);

  useEffect(() => {
    if (!init || !isChatOpen) return;
    const refresh = () => void refreshMessages().catch(() => undefined);
    refresh();
    const intervalId = window.setInterval(refresh, ACTIVE_CHAT_POLL_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [init, isChatOpen, refreshMessages]);

  return { isThinking, startThinking, stopThinking };
}
