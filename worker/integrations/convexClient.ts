import { signIntegrationRequest } from "../../shared/integrations/assertion";
import {
  INTEGRATION_PATH,
  integrationResultSchema,
  RESPONSE_LIMIT,
  type IntegrationOperation,
  type VerifiedMcpPrincipal,
} from "../../shared/integrations/contracts";
import { readBoundedBody } from "../../shared/integrations/body";
import { IntegrationError } from "../../shared/integrations/errors";

export type BackendEnvironment = {
  INTEGRATION_ENABLED: string;
  INTEGRATION_SIGNING_KEY: string;
  INTEGRATION_KEY_ID: string;
  CONVEX_INTEGRATION_URL: string;
  INTEGRATION_ENVIRONMENT: string;
};
export async function callIntegrationBackend(
  input: { principal: VerifiedMcpPrincipal; operation: IntegrationOperation },
  env: BackendEnvironment,
) {
  if (env.INTEGRATION_ENABLED !== "true")
    throw new Error("Integration disabled");
  for (const field of [
    env.INTEGRATION_SIGNING_KEY,
    env.INTEGRATION_KEY_ID,
    env.INTEGRATION_ENVIRONMENT,
    env.CONVEX_INTEGRATION_URL,
  ]) {
    if (!field) throw new Error("Missing integration backend configuration");
  }
  const endpoint = new URL(env.CONVEX_INTEGRATION_URL);
  if (
    endpoint.protocol !== "https:" ||
    endpoint.pathname !== INTEGRATION_PATH ||
    endpoint.search ||
    endpoint.hash
  )
    throw new Error("Invalid integration endpoint");
  const body = JSON.stringify(input);
  const token = await signIntegrationRequest(
    body,
    env.INTEGRATION_SIGNING_KEY,
    env.INTEGRATION_KEY_ID,
    env.INTEGRATION_ENVIRONMENT,
  );
  const response = await fetch(endpoint, {
    method: "POST",
    redirect: "manual",
    signal: AbortSignal.timeout(8000),
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body,
  });
  if (response.status >= 300 && response.status < 400)
    throw new IntegrationError("BACKEND_REDIRECT_DENIED", 502);
  const result: unknown = JSON.parse(
    await readBoundedBody(response, RESPONSE_LIMIT),
  );
  if (!response.ok) {
    const error =
      typeof result === "object" && result !== null && "error" in result
        ? result.error
        : "BACKEND_UNAVAILABLE";
    const allowed = [
      "SNAPSHOT_NOT_READY",
      "CONNECTION_APPROVAL_REQUIRED",
      "PERMISSION_DENIED",
      "NOT_FOUND",
      "WORKSPACE_UNAVAILABLE",
    ];
    throw new IntegrationError(
      typeof error === "string" && allowed.includes(error)
        ? error
        : "BACKEND_UNAVAILABLE",
      response.status,
    );
  }
  return integrationResultSchema.parse(result);
}
