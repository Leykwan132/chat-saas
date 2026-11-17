import { createRemoteJWKSet } from "jose";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createKilobotMcpServer } from "./server";
import { verifyMcpAccessToken } from "./auth";
import { introspectWorkosToken } from "./workosIntrospection";
import { validateMcpEnvironment, type McpEnvironment } from "./env";
import { bodyHash } from "../shared/integrations/assertion";
import { readBoundedBody } from "../shared/integrations/body";
import {
  REQUEST_LIMIT,
  integrationResultSchema,
} from "../shared/integrations/contracts";
import { IntegrationError, errorResponse } from "../shared/integrations/errors";
import { withDeadline } from "./deadline";

const keySets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();
async function budget(env: McpEnvironment, name: string, limit: number) {
  const id = env.CONSENT_LIMITER.idFromName(await bodyHash(name));
  const result = await env.CONSENT_LIMITER.get(id).consume(limit);
  if (!result.allowed) throw new IntegrationError("RATE_LIMITED", 429);
}

export async function handleMcpRequest(
  request: Request,
  env: McpEnvironment,
): Promise<Response> {
  const signal = AbortSignal.timeout(10000);
  if (env.MCP_ENABLED !== "true")
    return errorResponse(new IntegrationError("MCP_DISABLED", 503));
  try {
    validateMcpEnvironment(env);
    const url = new URL(request.url);
    const resource = new URL(env.MCP_RESOURCE);
    if (url.origin !== resource.origin)
      return new Response(null, { status: 404 });
    if (
      request.method === "GET" &&
      [
        "/.well-known/oauth-protected-resource",
        "/.well-known/oauth-protected-resource/mcp",
      ].includes(url.pathname)
    ) {
      return Response.json({
        resource: env.MCP_RESOURCE,
        authorization_servers: [env.WORKOS_ISSUER],
        scopes_supported: ["openid", "profile", "email", "offline_access"],
      });
    }
    if (url.pathname !== "/mcp") return new Response(null, { status: 404 });
    if (request.method !== "POST")
      return new Response(null, { status: 405, headers: { allow: "POST" } });
    const origin = request.headers.get("origin");
    if (
      origin &&
      origin !== "https://chatgpt.com" &&
      origin !== resource.origin
    )
      throw new IntegrationError("ORIGIN_DENIED", 403);
    await withDeadline(
      budget(
        env,
        `ip:${request.headers.get("cf-connecting-ip") ?? "local"}`,
        120,
      ),
      signal,
    );
    const body = await withDeadline(
      readBoundedBody(request, REQUEST_LIMIT),
      signal,
    );
    const token = request.headers
      .get("authorization")
      ?.match(/^Bearer (\S+)$/)?.[1];
    if (!token) throw new IntegrationError("AUTHENTICATION_REQUIRED", 401);
    let jwks = keySets.get(env.WORKOS_JWKS_URL);
    if (!jwks) {
      jwks = createRemoteJWKSet(new URL(env.WORKOS_JWKS_URL), {
        timeoutDuration: 3000,
      });
      keySets.set(env.WORKOS_JWKS_URL, jwks);
    }
    const principal = await withDeadline(
      verifyMcpAccessToken(
        token,
        { issuer: env.WORKOS_ISSUER, resource: env.MCP_RESOURCE, jwks },
        (accessToken) => introspectWorkosToken(accessToken, env, signal),
      ),
      signal,
    );
    const server = createKilobotMcpServer(async (operation) => {
      await withDeadline(
        budget(env, `${principal.issuer}:${principal.consentId}`, 30),
        signal,
      );
      let result;
      try {
        result = await withDeadline(
          env.KILOBOT_BACKEND.execute(principal, operation),
          signal,
        );
      } catch (error) {
        const code =
          error instanceof Error ? error.message : "BACKEND_UNAVAILABLE";
        const known = [
          "SNAPSHOT_NOT_READY",
          "CONNECTION_APPROVAL_REQUIRED",
          "PERMISSION_DENIED",
          "NOT_FOUND",
          "WORKSPACE_UNAVAILABLE",
          "REQUEST_TIMED_OUT",
        ];
        throw new IntegrationError(
          known.includes(code) ? code : "BACKEND_UNAVAILABLE",
          code === "NOT_FOUND" ? 404 : 503,
        );
      }
      return integrationResultSchema.parse(result);
    });
    const transport = new WebStandardStreamableHTTPServerTransport({
      enableJsonResponse: true,
    });
    await server.connect(transport);
    try {
      return await withDeadline(
        transport.handleRequest(new Request(request, { body, signal })),
        signal,
      );
    } finally {
      await server.close();
    }
  } catch (error) {
    const response = errorResponse(error);
    if (response.status === 401)
      response.headers.set(
        "WWW-Authenticate",
        `Bearer resource_metadata="${new URL("/.well-known/oauth-protected-resource/mcp", env.MCP_RESOURCE).href}"`,
      );
    return response;
  }
}
