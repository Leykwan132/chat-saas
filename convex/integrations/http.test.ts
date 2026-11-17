import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { exportJWK, exportPKCS8, generateKeyPair } from "jose";
import schema from "../schema";
import { integrationTestModules } from "../../tests/integrationModules";
import { signIntegrationRequest } from "../../shared/integrations/assertion";

afterEach(() => vi.unstubAllEnvs());
beforeEach(() => {
  vi.stubEnv("WORKOS_CLIENT_ID", "client_test");
  vi.stubEnv("WORKOS_API_KEY", "sk_test_placeholder");
  vi.stubEnv("WORKOS_WEBHOOK_SECRET", "whsec_placeholder");
  vi.stubEnv("INTEGRATION_ENVIRONMENT", "staging");
  vi.stubEnv("INTEGRATION_VERIFICATION_JWKS", JSON.stringify({ keys: [] }));
});
it("rejects unsigned HTTP requests before creating any connection", async () => {
  vi.stubEnv("INTEGRATION_ENABLED", "true");
  const t = convexTest(schema, integrationTestModules);
  const response = await t.fetch("/integrations/mcp/read", {
    method: "POST",
    body: "{}",
  });
  expect(response.status).toBe(401);
  expect(
    await t.run(async (ctx) => ctx.db.query("integrationConnections").take(1)),
  ).toEqual([]);
});

it("accepts only the gateway signature and configured source issuer", async () => {
  const keys = await generateKeyPair("RS256", { extractable: true });
  const jwks = {
    keys: [{ ...(await exportJWK(keys.publicKey)), kid: "test" }],
  };
  vi.stubEnv("INTEGRATION_ENABLED", "true");
  vi.stubEnv("INTEGRATION_ENVIRONMENT", "staging");
  vi.stubEnv("INTEGRATION_VERIFICATION_JWKS", JSON.stringify(jwks));
  vi.stubEnv("WORKOS_CONNECT_ISSUER", "https://auth.example");
  const body = JSON.stringify({
    principal: {
      issuer: "https://foreign.example",
      subject: "user_test",
      orgId: "org",
      consentId: "consent",
      clientId: "client",
      grantedScopes: ["openid"],
    },
    operation: { operation: "get_connection_context", agentLimit: 10 },
  });
  const assertion = await signIntegrationRequest(
    body,
    await exportPKCS8(keys.privateKey),
    "test",
    "staging",
  );
  const t = convexTest(schema, integrationTestModules);
  const response = await t.fetch("/integrations/mcp/read", {
    method: "POST",
    body,
    headers: { authorization: `Bearer ${assertion}` },
  });
  expect(response.status).toBe(401);
});

it("requires pilot approval across the signed HTTP boundary and records safe audit metadata", async () => {
  const keys = await generateKeyPair("RS256", { extractable: true });
  vi.stubEnv("INTEGRATION_ENABLED", "true");
  vi.stubEnv(
    "INTEGRATION_VERIFICATION_JWKS",
    JSON.stringify({
      keys: [{ ...(await exportJWK(keys.publicKey)), kid: "test" }],
    }),
  );
  vi.stubEnv("WORKOS_CONNECT_ISSUER", "https://auth.example");
  const principal = {
    issuer: "https://auth.example",
    subject: "user_test",
    orgId: "org_test",
    consentId: "consent",
    clientId: "client",
    grantedScopes: ["openid"],
  };
  const body = JSON.stringify({
    principal,
    operation: { operation: "get_connection_context", agentLimit: 10 },
  });
  const assertion = await signIntegrationRequest(
    body,
    await exportPKCS8(keys.privateKey),
    "test",
    "staging",
  );
  const t = convexTest(schema, integrationTestModules);
  await t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      workosUserId: principal.subject,
      email: "test@example.com",
      createdAt: now,
      updatedAt: now,
    });
    const teamId = await ctx.db.insert("teams", {
      name: "Test",
      type: "organizational",
      workosOrgId: principal.orgId,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("teamMemberships", {
      userId,
      teamId,
      role: "owner",
      createdAt: now,
    });
  });
  const call = () =>
    t.fetch("/integrations/mcp/read", {
      method: "POST",
      body,
      headers: { authorization: `Bearer ${assertion}` },
    });
  const approved = await call();
  expect(approved.status).toBe(200);
  expect(await approved.json()).toMatchObject({
    operation: "get_connection_context",
    items: [],
    workspace: { id: principal.orgId },
  });
  const audit = await t.run(async (ctx) =>
    ctx.db.query("integrationAudit").order("desc").first(),
  );
  expect(audit).toMatchObject({
    outcome: "success",
    resultCount: 0,
    requestId: expect.any(String),
    durationMs: expect.any(Number),
  });
});
