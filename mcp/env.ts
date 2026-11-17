import type {
  IntegrationOperation,
  IntegrationResult,
  VerifiedMcpPrincipal,
} from "../shared/integrations/contracts";
import type { ConsentRateLimiter } from "./limits";

export type McpEnvironment = {
  MCP_ENABLED: string;
  MCP_RESOURCE: string;
  WORKOS_ISSUER: string;
  WORKOS_JWKS_URL: string;
  WORKOS_INTROSPECTION_CLIENT_ID: string;
  WORKOS_INTROSPECTION_CLIENT_SECRET: string;
  KILOBOT_BACKEND: {
    execute(
      principal: VerifiedMcpPrincipal,
      operation: IntegrationOperation,
    ): Promise<IntegrationResult>;
  };
  CONSENT_LIMITER: DurableObjectNamespace<ConsentRateLimiter>;
};

export function validateMcpEnvironment(env: McpEnvironment) {
  for (const value of [
    env.MCP_RESOURCE,
    env.WORKOS_ISSUER,
    env.WORKOS_JWKS_URL,
    env.WORKOS_INTROSPECTION_CLIENT_ID,
    env.WORKOS_INTROSPECTION_CLIENT_SECRET,
  ]) {
    if (!value) throw new Error("Missing MCP authentication configuration");
  }
  const resource = new URL(env.MCP_RESOURCE);
  const issuer = new URL(env.WORKOS_ISSUER);
  if (
    resource.protocol !== "https:" ||
    resource.pathname !== "/mcp" ||
    resource.search ||
    resource.hash ||
    issuer.protocol !== "https:" ||
    issuer.pathname !== "/" ||
    env.WORKOS_ISSUER.endsWith("/") ||
    env.WORKOS_JWKS_URL !== `${env.WORKOS_ISSUER}/oauth2/jwks`
  )
    throw new Error("Invalid MCP OAuth configuration");
  if (!env.KILOBOT_BACKEND || !env.CONSENT_LIMITER)
    throw new Error("Missing MCP service bindings");
}
