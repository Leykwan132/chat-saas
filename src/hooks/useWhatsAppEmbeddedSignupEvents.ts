import { useEffect } from 'react';

type EmbeddedSignupMessage = {
  type: 'WA_EMBEDDED_SIGNUP';
  event: 'FINISH' | 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING' | 'CANCEL' | 'ERROR';
  data?: {
    error_message?: string;
  };
};

export function useWhatsAppEmbeddedSignupEvents({
  onCancel,
  onError,
}: {
  onCancel: () => void;
  onError: (message: string) => void;
}) {
  useEffect(() => {
    const receiveMessage = (event: MessageEvent) => {
      let payload: EmbeddedSignupMessage | null = null;
      try {
        if (typeof event.data === 'string') {
          payload = JSON.parse(event.data) as EmbeddedSignupMessage;
        } else if (typeof event.data === 'object' && event.data !== null) {
          payload = event.data as EmbeddedSignupMessage;
        }
      } catch (error) {
        console.error('[whatsapp-connect] Meta message parse failed', {
          error,
          origin: event.origin,
        });
        return;
      }
      if (payload?.type !== 'WA_EMBEDDED_SIGNUP') return;
      console.info('[whatsapp-connect] embedded signup event received', {
        origin: event.origin,
        event: payload.event,
        hasErrorMessage: Boolean(payload.data?.error_message),
      });
      if (payload.event === 'CANCEL') {
        onCancel();
      } else if (payload.event === 'ERROR') {
        onError(payload.data?.error_message ?? 'Embedded Signup failed.');
      }
    };

    window.addEventListener('message', receiveMessage);
    return () => window.removeEventListener('message', receiveMessage);
  }, [onCancel, onError]);
}
