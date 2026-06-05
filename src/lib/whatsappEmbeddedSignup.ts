/** Meta WhatsApp Embedded Signup — hosted onboarding URL defaults. */
export const WHATSAPP_EMBEDDED_SIGNUP_DEFAULTS = {
  appId: '999704942713974',
  configId: '930728386670710',
} as const;

const WHATSAPP_ONBOARD_ORIGIN = 'https://business.facebook.com';

/** Opens Meta's hosted WhatsApp Business onboarding flow for the given app + config. */
export function buildWhatsAppOnboardUrl(appId: string, configId: string): string {
  const url = new URL(`${WHATSAPP_ONBOARD_ORIGIN}/messaging/whatsapp/onboard/`);
  url.searchParams.set('app_id', appId);
  url.searchParams.set('config_id', configId);
  return url.toString();
}

export function resolveWhatsAppEmbeddedSignupIds(env: {
  appId?: string;
  configId?: string;
}): { appId: string; configId: string } | null {
  const appId = env.appId?.trim() || WHATSAPP_EMBEDDED_SIGNUP_DEFAULTS.appId;
  const configId = env.configId?.trim() || WHATSAPP_EMBEDDED_SIGNUP_DEFAULTS.configId;
  if (!appId || !configId) return null;
  return { appId, configId };
}
