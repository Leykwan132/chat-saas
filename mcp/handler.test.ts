import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { decodeJwt, exportJWK, generateKeyPair, SignJWT } from "jose";
import { handleMcpRequest } from "./handler";
import type { McpEnvironment } from "./env";

let keys: Awaited<ReturnType<typeof generateKeyPair>>;
beforeAll(async () => {
  keys = await generateKeyPair("RS256", { extractable: true });
});
afterEach(() => vi.unstubAllGlobals());

const issuer = "https://handler-auth.example";
const resource = "https://mcp.example/mcp";
async function token(
  subject = "user_test",
  extra: Record<string, unknown> = {},
) {
  return new SignJWT({
    org_id: "org_test",
    sid: `consent_${subject}`,
    client_id: "client",
    scope: "openid",
    ...extra,
  })
    .setProtectedHeader({ alg: "RS256", kid: "test" })
    .setSubject(subject)
    .setIssuer(issuer)
    .setAudience(resource)
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(keys.privateKey);
}
async function fixture() {
  const jwk = { ...(await exportJWK(keys.publicKey)), kid: "test" };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).endsWith("/oauth2/jwks"))
        return Response.json({ keys: [jwk] });
      const value = new URLSearchParams(String(init?.body)).get("token")!;
      return Response.json({
        ...decodeJwt(value),
        active: true,
        token_type: "access_token",
      });
    }),
  );
  const execute = vi.fn(async (principal) => ({
    operation: "get_connection_context",
    items: [
      {
        agentId: principal.subject,
        name: "Support",
        capability: "conversations:read",
      },
    ],
    nextCursor: null,
    workspace: { id: principal.orgId, name: "Test" },
  }));
  const env = {
    MCP_ENABLED: "true",
    MCP_RESOURCE: resource,
    WORKOS_ISSUER: issuer,
    WORKOS_JWKS_URL: `${issuer}/oauth2/jwks`,
    WORKOS_INTROSPECTION_CLIENT_ID: "introspection",
    WORKOS_INTROSPECTION_CLIENT_SECRET: "secret",
    KILOBOT_BACKEND: { execute },
    CONSENT_LIMITER: {
      idFromName: (name: string) => name,
      get: () => ({
        consume: async () => ({ allowed: true, retryAfterSeconds: 0 }),
      }),
    },
  } as unknown as McpEnvironment;
  return { env, execute };
}
function request(accessToken?: string, body?: string) {
  return new Request(resource, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
    },
    body:
      body ??
      JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: "get_connection_context", arguments: {} },
      }),
  });
}

describe("authenticated MCP request routing", () => {
  it("sends verified user context through the backend binding", async () => {
    const { env, execute } = await fixture();
    const response = await handleMcpRequest(request(await token()), env);
    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json.result.structuredContent.workspace.id).toBe("org_test");
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({ subject: "user_test", orgId: "org_test" }),
      { operation: "get_connection_context", agentLimit: 10 },
    );
  });
  it("keeps concurrent users separate", async () => {
    const { env } = await fixture();
    const [a, b] = await Promise.all(
      ["user_a", "user_b"].map(async (user) => {
        const response = await handleMcpRequest(
          request(await token(user)),
          env,
        );
        return response.json();
      }),
    );
    expect(a.result.structuredContent.items[0].agentId).toBe("user_a");
    expect(b.result.structuredContent.items[0].agentId).toBe("user_b");
  });
  it("challenges unauthenticated calls and denies missing organizations", async () => {
    const { env, execute } = await fixture();
    const unauthenticated = await handleMcpRequest(request(), env);
    expect(unauthenticated.status).toBe(401);
    expect(unauthenticated.headers.get("WWW-Authenticate")).toContain(
      "oauth-protected-resource/mcp",
    );
    expect(
      (
        await handleMcpRequest(
          request(await token("user_test", { org_id: "" })),
          env,
        )
      ).status,
    ).toBe(401);
    expect(execute).not.toHaveBeenCalled();
  });
  it("rejects oversize bodies before authentication and publishes only matching resource metadata", async () => {
    const { env, execute } = await fixture();
    expect(
      (await handleMcpRequest(request(undefined, "x".repeat(20481)), env))
        .status,
    ).toBe(413);
    const response = await handleMcpRequest(
      new Request(
        "https://mcp.example/.well-known/oauth-protected-resource/mcp",
      ),
      env,
    );
    expect(await response.json()).toMatchObject({
      resource,
      authorization_servers: [issuer],
    });
    expect(execute).not.toHaveBeenCalled();
  });
});
