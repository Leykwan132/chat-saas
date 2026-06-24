/** Meta WhatsApp Embedded Signup — hosted onboarding URL defaults. */
export const WHATSAPP_EMBEDDED_SIGNUP_DEFAULTS = {
  appId: '999704942713974',
  configId: '930728386670710',
} as const;

const WHATSAPP_ONBOARD_ORIGIN = 'https://business.facebook.com';

export const WHATSAPP_OAUTH_REDIRECT_CODE_KEY = 'whatsapp_oauth_redirect_code';

/** OAuth redirect URI for embedded signup + code exchange (must match Meta app settings). */
export function resolveWhatsAppOAuthRedirectUri(): string | undefined {
  const explicit =
    (import.meta.env.VITE_WHATSAPP_CODE_EXCHANGE_REDIRECT_URI as
      | string
      | undefined)?.trim() ||
    (import.meta.env.VITE_WHATSAPP_REDIRECT_URI as string | undefined)?.trim();
  if (explicit) return explicit;

  const siteUrl = (import.meta.env.VITE_CONVEX_SITE_URL as string | undefined)?.trim();
  if (!siteUrl) return undefined;
  return `${siteUrl.replace(/\/+$/, '')}/auth/whatsapp/callback`;
}

/** Opens Meta's hosted WhatsApp Business onboarding flow for the given app + config. */
export function buildWhatsAppOnboardUrl(appId: string, configId: string): string {
  const url = new URL(`${WHATSAPP_ONBOARD_ORIGIN}/messaging/whatsapp/onboard/`);
  url.searchParams.set('app_id', appId);
  url.searchParams.set('config_id', configId);

  const extras = {
    version: 'v4',
    sessionInfoVersion: '3',
    featureType: 'whatsapp_business_app_onboarding',
  };
  url.searchParams.set('extras', JSON.stringify(extras));

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
