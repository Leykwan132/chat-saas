import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { WebWidgetPreviewMessage } from './WebWidgetPreviewConversation';

function previewVisitorStorageKey(publicKey: string) {
  return `kilobot:widget-preview:${publicKey}:visitorId`;
}

function createPreviewVisitorId() {
  return `preview_${crypto.randomUUID()}`;
}

function readPreviewVisitorId(publicKey: string) {
  const storageKey = previewVisitorStorageKey(publicKey);
  const existing = window.localStorage.getItem(storageKey);
  if (existing) return existing;
  const next = createPreviewVisitorId();
  window.localStorage.setItem(storageKey, next);
  return next;
}

export function useWebWidgetPreviewConversation(publicKey: string) {
  const [previewOverride, setPreviewOverride] = useState<{
    publicKey: string;
    visitorId: string;
  } | null>(null);
  const visitorId = useMemo(
    () =>
      previewOverride?.publicKey === publicKey
        ? previewOverride.visitorId
        : readPreviewVisitorId(publicKey),
    [previewOverride, publicKey],
  );
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const receiveMessage = useMutation(api.webWidget.publicReceiveMessage);
  const storedMessages = useQuery(api.webWidget.publicListMessages, {
    publicKey,
    visitorId,
  });

  const messages = useMemo<WebWidgetPreviewMessage[]>(
    () =>
      (storedMessages ?? []).map((message) => ({
        id: message.id,
        role: message.direction === 'incoming' ? 'user' : 'assistant',
        content: message.content,
        contentType: message.contentType,
        mediaUrl: message.mediaUrl,
        createdAt: message.createdAt,
      })),
    [storedMessages],
  );

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || sending) return false;
      setSending(true);
      setSendError(null);
      try {
        await receiveMessage({
          publicKey,
          visitorId,
          content: trimmed,
          pageUrl: window.location.href,
        });
        return true;
      } catch (error) {
        setSendError(error instanceof Error ? error.message : String(error));
        return false;
      } finally {
        setSending(false);
      }
    },
    [publicKey, receiveMessage, sending, visitorId],
  );

  const resetConversation = useCallback(() => {
    const next = createPreviewVisitorId();
    window.localStorage.setItem(previewVisitorStorageKey(publicKey), next);
    setPreviewOverride({ publicKey, visitorId: next });
    setSendError(null);
  }, [publicKey]);

  return {
    loading: storedMessages === undefined,
    messages,
    resetConversation,
    sendError,
    sending,
    sendMessage,
  };
}
