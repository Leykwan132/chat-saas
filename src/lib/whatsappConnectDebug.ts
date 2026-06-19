const LOG_PREFIX = '[whatsapp-connect]';

export type WhatsAppConnectPhase =
  | 'launch'
  | 'message'
  | 'auth-code'
  | 'complete'
  | 'fallback';

/** Client-side debug logging for the WhatsApp Embedded Signup flow. */
export function logWhatsAppConnect(
  phase: WhatsAppConnectPhase,
  step: string,
  data?: Record<string, unknown>,
) {
  if (data === undefined) {
    console.log(`${LOG_PREFIX}:${phase}`, step);
    return;
  }
  console.log(`${LOG_PREFIX}:${phase}`, step, data);
}
