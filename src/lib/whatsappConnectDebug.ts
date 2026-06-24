const LOG_PREFIX = '[whatsapp-connect]';

export type WhatsAppConnectPhase =
  | 'launch'
  | 'message'
  | 'auth-code'
  | 'complete'
  | 'fallback'
  | 'dialog';

const SECRET_KEYS = new Set(['code', 'accessToken', 'access_token', 'signedRequest']);

/** Redact auth secrets before logging Facebook payloads. */
export function redactFacebookPayload<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.map((item) => redactFacebookPayload(item)) as T;
  }
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (SECRET_KEYS.has(key) && typeof val === 'string') {
      out[key] = `[redacted len=${val.length}]`;
    } else {
      out[key] = redactFacebookPayload(val);
    }
  }
  return out as T;
}

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
