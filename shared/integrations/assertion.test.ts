import { describe, expect, it } from "vitest";
import { exportJWK, exportPKCS8, generateKeyPair } from "jose";
import { signIntegrationRequest, verifyIntegrationRequest } from "./assertion";

describe("operation-bound backend authentication", () => {
  it("verifies a signed request and rejects tampering and excessive age", async () => {
    const keys = await generateKeyPair("RS256", { extractable: true });
    const privateKey = await exportPKCS8(keys.privateKey);
    const publicKey = { ...(await exportJWK(keys.publicKey)), kid: "test" };
    const body = JSON.stringify({
      principal: {
        issuer: "https://auth.example",
        subject: "user",
        orgId: "org",
        consentId: "consent",
        clientId: "client",
        grantedScopes: ["openid"],
      },
      operation: { operation: "get_connection_context", agentLimit: 10 },
    });
    const token = await signIntegrationRequest(
      body,
      privateKey,
      "test",
      "staging",
    );
    const request = () =>
      new Request("https://backend.example/integrations/mcp/read", {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        body,
      });
    const config = { jwks: { keys: [publicKey] }, environment: "staging" };
    expect(await verifyIntegrationRequest(request(), config)).toMatchObject({
      principal: { subject: "user" },
    });
    await expect(
      verifyIntegrationRequest(
        new Request(request(), { body: `${body} ` }),
        config,
      ),
    ).rejects.toThrow();
    await expect(
      verifyIntegrationRequest(request(), {
        ...config,
        environment: "production",
      }),
    ).rejects.toThrow();
    await expect(
      verifyIntegrationRequest(
        new Request("https://backend.example/other", {
          method: "POST",
          headers: { authorization: `Bearer ${token}` },
          body,
        }),
        config,
      ),
    ).rejects.toThrow();
  });
});
