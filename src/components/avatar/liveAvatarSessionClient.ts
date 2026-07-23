import {
  AgentEventsEnum,
  LiveAvatarSession,
  SessionEvent,
  type SessionDisconnectReason,
} from '@heygen/liveavatar-web-sdk';
import type { AvatarSessionClient } from './avatarSessionRuntime';

export function createLiveAvatarSessionClient(token: string): AvatarSessionClient {
  const session = new LiveAvatarSession(token);
  return {
    bind(handlers) {
      const streamReady = () => handlers.streamReady();
      const disconnected = (reason: SessionDisconnectReason) => {
        handlers.disconnected(reason.toString());
      };
      const userSpeechStarted = () => handlers.userSpeechStarted();
      const userSpeechEnded = () => handlers.userSpeechEnded();
      const userTranscription = (event: {
        event_id: string;
        source_event_id?: string;
        text: string;
      }) => {
        handlers.userTranscription({
          eventId: event.event_id,
          sourceEventId: event.source_event_id ?? null,
          text: event.text,
        });
      };
      const avatarSpeechStarted = () => handlers.avatarSpeechStarted();
      const avatarSpeechEnded = () => handlers.avatarSpeechEnded();
      const stopped = (event: {
        event_id: string;
        source_event_id?: string;
        stop_reason: string;
      }) => {
        handlers.stopped({
          eventId: event.event_id,
          sourceEventId: event.source_event_id ?? null,
          stopReason: event.stop_reason,
        });
      };
      session.on(SessionEvent.SESSION_STREAM_READY, streamReady);
      session.on(SessionEvent.SESSION_DISCONNECTED, disconnected);
      session.on(AgentEventsEnum.USER_SPEAK_STARTED, userSpeechStarted);
      session.on(AgentEventsEnum.USER_SPEAK_ENDED, userSpeechEnded);
      session.on(AgentEventsEnum.USER_TRANSCRIPTION, userTranscription);
      session.on(AgentEventsEnum.AVATAR_SPEAK_STARTED, avatarSpeechStarted);
      session.on(AgentEventsEnum.AVATAR_SPEAK_ENDED, avatarSpeechEnded);
      session.on(AgentEventsEnum.SESSION_STOPPED, stopped);
      return () => {
        session.off(SessionEvent.SESSION_STREAM_READY, streamReady);
        session.off(SessionEvent.SESSION_DISCONNECTED, disconnected);
        session.off(AgentEventsEnum.USER_SPEAK_STARTED, userSpeechStarted);
        session.off(AgentEventsEnum.USER_SPEAK_ENDED, userSpeechEnded);
        session.off(AgentEventsEnum.USER_TRANSCRIPTION, userTranscription);
        session.off(AgentEventsEnum.AVATAR_SPEAK_STARTED, avatarSpeechStarted);
        session.off(AgentEventsEnum.AVATAR_SPEAK_ENDED, avatarSpeechEnded);
        session.off(AgentEventsEnum.SESSION_STOPPED, stopped);
      };
    },
    start: () => session.start(),
    stop: () => session.stop(),
    attach: (element) => session.attach(element),
    startVoiceChat: () => session.voiceChat.start(),
    stopVoiceChat: () => session.voiceChat.stop(),
    mute: () => session.voiceChat.mute(),
    unmute: () => session.voiceChat.unmute(),
    interrupt: () => session.interrupt(),
    repeat: (text) => session.repeat(text),
  };
}
