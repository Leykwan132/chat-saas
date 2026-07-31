export type DebugTokenResponse = {
  data?: {
    granular_scopes?: Array<{
      scope?: string;
      target_ids?: string[];
    }>;
  };
};

export type WhatsAppPhoneNumber = {
  id: string;
  display_phone_number?: string;
};

export type WhatsAppPhoneNumbersResponse = {
  data?: WhatsAppPhoneNumber[];
};

export type TokenExchangeResponse = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
};

export type WhatsAppMetaSignupAssets = {
  wabaId: string;
  phoneNumber: WhatsAppPhoneNumber;
};

export type WhatsAppMetaSignupClient = {
  exchangeAuthorizationCode(code: string): Promise<TokenExchangeResponse>;
  discoverAssets(accessToken: string): Promise<WhatsAppMetaSignupAssets>;
  subscribeWaba(wabaId: string, accessToken: string): Promise<void>;
};

type MetaGraphError = {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
};

type MetaSignupClientOptions = {
  appId: string;
  appSecret: string;
  graphVersion: string;
  fetcher?: typeof fetch;
};

export function selectFirstMetaAppCredentials({
  appIds,
  appSecrets,
}: {
  appIds?: string;
  appSecrets?: string;
}): { appId: string; appSecret: string } {
  if (!appIds || !appSecrets) {
    throw new Error(
      "META_APP_ID / META_APP_SECRET are not configured on the Convex deployment.",
    );
  }
  const parsedAppIds = appIds.split("|").map((value) => value.trim());
  const parsedAppSecrets = appSecrets.split("|").map((value) => value.trim());
  if (
    parsedAppIds.length !== parsedAppSecrets.length ||
    parsedAppIds.some((value) => value.length === 0) ||
    parsedAppSecrets.some((value) => value.length === 0)
  ) {
    throw new Error(
      "META_APP_ID and META_APP_SECRET must have matching pipe-separated values.",
    );
  }
  return { appId: parsedAppIds[0], appSecret: parsedAppSecrets[0] };
}

async function requestMeta<T>(
  fetcher: typeof fetch,
  url: URL,
  init: RequestInit,
  context: string,
): Promise<T> {
  const response = await fetcher(url, init);
  const text = await response.text();
  let body: unknown;
  try {
    body = text.length > 0 ? JSON.parse(text) : {};
  } catch {
    body = text;
  }
  if (!response.ok) {
    const error = (body as MetaGraphError).error;
    const message = error?.message ?? `HTTP ${response.status}`;
    console.warn("[whatsapp-connect]:graph", context, {
      status: response.status,
      type: error?.type,
      code: error?.code,
      errorSubcode: error?.error_subcode,
      fbtraceId: error?.fbtrace_id,
    });
    throw new Error(`${context} failed: ${message}`);
  }
  return body as T;
}

export function selectSingleWhatsAppBusinessAccountId(
  response: DebugTokenResponse,
): string {
  const targetIds = new Set(
    response.data?.granular_scopes
      ?.filter((scope) => scope.scope === "whatsapp_business_management")
      .flatMap((scope) => scope.target_ids ?? [])
      .filter((targetId) => targetId.length > 0) ?? [],
  );
  if (targetIds.size !== 1) {
    throw new Error(
      `Expected Meta to authorize exactly one WhatsApp Business Account, received ${targetIds.size}.`,
    );
  }
  return [...targetIds][0];
}

export function selectSingleWhatsAppPhoneNumber(
  response: WhatsAppPhoneNumbersResponse,
): WhatsAppPhoneNumber {
  const phoneNumbers = response.data ?? [];
  if (phoneNumbers.length !== 1) {
    throw new Error(
      `Expected Meta to return exactly one WhatsApp phone number, received ${phoneNumbers.length}.`,
    );
  }
  return phoneNumbers[0];
}

export function createWhatsAppMetaSignupClient({
  appId,
  appSecret,
  graphVersion,
  fetcher = fetch,
}: MetaSignupClientOptions): WhatsAppMetaSignupClient {
  const graphBase = `https://graph.facebook.com/${graphVersion}`;

  return {
    async exchangeAuthorizationCode(code) {
      const url = new URL(`${graphBase}/oauth/access_token`);
      url.searchParams.set("client_id", appId);
      url.searchParams.set("client_secret", appSecret);
      url.searchParams.set("code", code);
      return await requestMeta<TokenExchangeResponse>(
        fetcher,
        url,
        { method: "GET" },
        "Code exchange",
      );
    },

    async discoverAssets(accessToken) {
      const debugUrl = new URL(`${graphBase}/debug_token`);
      debugUrl.searchParams.set("input_token", accessToken);
      const debugToken = await requestMeta<DebugTokenResponse>(
        fetcher,
        debugUrl,
        { headers: { Authorization: `Bearer ${appId}|${appSecret}` } },
        "Token inspection",
      );
      const wabaId = selectSingleWhatsAppBusinessAccountId(debugToken);
      const phoneUrl = new URL(`${graphBase}/${wabaId}/phone_numbers`);
      phoneUrl.searchParams.set("fields", "id,display_phone_number");
      const phoneNumbers = await requestMeta<WhatsAppPhoneNumbersResponse>(
        fetcher,
        phoneUrl,
        { headers: { Authorization: `Bearer ${accessToken}` } },
        "Phone number discovery",
      );
      return {
        wabaId,
        phoneNumber: selectSingleWhatsAppPhoneNumber(phoneNumbers),
      };
    },

    async subscribeWaba(wabaId, accessToken) {
      await requestMeta<unknown>(
        fetcher,
        new URL(`${graphBase}/${wabaId}/subscribed_apps`),
        {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
        },
        "WABA subscribe",
      );
    },
  };
}
