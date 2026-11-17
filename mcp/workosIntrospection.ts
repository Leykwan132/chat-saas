import { IntegrationError } from "../shared/integrations/errors";

export async function introspectWorkosToken(
  token: string,
  config: {
    WORKOS_ISSUER: string;
    WORKOS_INTROSPECTION_CLIENT_ID: string;
    WORKOS_INTROSPECTION_CLIENT_SECRET: string;
  },
  signal: AbortSignal,
): Promise<Record<string, unknown>> {
  const response = await fetch(`${config.WORKOS_ISSUER}/oauth2/introspection`, {
    method: "POST",
    signal,
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      token,
      token_type_hint: "access_token",
      client_id: config.WORKOS_INTROSPECTION_CLIENT_ID,
      client_secret: config.WORKOS_INTROSPECTION_CLIENT_SECRET,
    }),
  });
  if (!response.ok)
    throw new IntegrationError("AUTH_PROVIDER_UNAVAILABLE", 503);
  return await response.json();
}
