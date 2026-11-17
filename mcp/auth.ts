import { jwtVerify, type JWTVerifyGetKey } from "jose";
import {
  principalSchema,
  type VerifiedMcpPrincipal,
} from "../shared/integrations/contracts";
import { IntegrationError } from "../shared/integrations/errors";

export type AuthConfig = {
  issuer: string;
  resource: string;
  jwks: JWTVerifyGetKey;
};
export async function verifyMcpAccessToken(
  token: string,
  config: AuthConfig,
  introspect: (token: string) => Promise<Record<string, unknown>>,
): Promise<VerifiedMcpPrincipal> {
  let payload;
  try {
    ({ payload } = await jwtVerify(token, config.jwks, {
      issuer: config.issuer,
      audience: config.resource,
      algorithms: ["RS256"],
      requiredClaims: ["sub", "exp", "iat", "sid", "org_id", "client_id"],
    }));
  } catch {
    throw new IntegrationError("INVALID_ACCESS_TOKEN", 401);
  }
  if (
    payload.sub_profile === "ai_agent" ||
    !String(payload.sub).startsWith("user")
  ) {
    throw new IntegrationError("USER_TOKEN_REQUIRED", 401);
  }
  const parsed = principalSchema.safeParse({
    issuer: payload.iss,
    subject: payload.sub,
    orgId: payload.org_id,
    consentId: payload.sid,
    clientId: payload.client_id,
    grantedScopes:
      typeof payload.scope === "string"
        ? payload.scope.split(" ").filter(Boolean)
        : [],
  });
  if (!parsed.success) throw new IntegrationError("INVALID_USER_CONTEXT", 401);
  if (!parsed.data.grantedScopes.includes("openid"))
    throw new IntegrationError("INSUFFICIENT_SCOPE", 403);
  const active = await introspect(token);
  if (
    active.active !== true ||
    active.token_type !== "access_token" ||
    active.sub !== payload.sub ||
    active.iss !== payload.iss ||
    active.org_id !== payload.org_id ||
    active.sid !== payload.sid ||
    active.client_id !== payload.client_id ||
    active.aud !== config.resource
  ) {
    throw new IntegrationError("INACTIVE_ACCESS_TOKEN", 401);
  }
  return parsed.data;
}
