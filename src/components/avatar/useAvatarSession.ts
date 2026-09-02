import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { useAction, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { getAvatarVisitorId } from '@/lib/avatarEmbed';
import { AvatarSessionRuntime } from './avatarSessionRuntime';
import type { AvatarSessionServices } from './avatarSessionRuntime';
import { createLiveAvatarSessionClient } from './liveAvatarSessionClient';

export function useAvatarSession(publicKey: string) {
  const beginSession = useAction(api.avatarSession.begin);
  const recordEvent = useMutation(api.avatarConversation.recordEvent);
  const services = useMemo<AvatarSessionServices>(() => ({
    begin: async () => {
      const visitorId = getAvatarVisitorId(
        window.localStorage,
        publicKey,
        () => crypto.randomUUID(),
      );
      const access = await beginSession({ publicKey, visitorId });
      return { publicKey, visitorId, ...access };
    },
    receiveTranscript: async () => {},
    recordEvent: async (identity, event) => {
      await recordEvent({
        ...identity,
        eventId: event.eventId,
        eventType: event.eventType,
        sourceEventId: event.sourceEventId ?? undefined,
        ...(event.endReason ? { endReason: event.endReason } : {}),
      });
    },
    createClient: createLiveAvatarSessionClient,
    splitSpeech: () => [],
    now: Date.now,
  }), [beginSession, publicKey, recordEvent]);
  const runtime = useMemo(() => new AvatarSessionRuntime(services), [services]);
  const snapshot = useSyncExternalStore(
    runtime.subscribe,
    runtime.getSnapshot,
    runtime.getSnapshot,
  );
  useEffect(() => () => {
    void runtime.destroy();
  }, [runtime]);

  return {
    ...snapshot,
    videoRef: runtime.attachVideo,
    start: runtime.start,
    stop: runtime.stop,
    mute: runtime.mute,
    unmute: runtime.unmute,
  };
}
