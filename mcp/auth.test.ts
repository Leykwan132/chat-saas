import { describe, expect, it } from "vitest";
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import { verifyMcpAccessToken } from "./auth";

describe("MCP user authentication", () => {
  it("requires the exact audience, organization and active consent", async () => {
    const keys = await generateKeyPair("RS256", { extractable: true });
    const jwks = createLocalJWKSet({
      keys: [{ ...(await exportJWK(keys.publicKey)), kid: "test" }],
    });
    const claims = {
      org_id: "org",
      sid: "consent",
      client_id: "client",
      scope: "openid",
    };
    const token = await new SignJWT(claims)
      .setProtectedHeader({ alg: "RS256", kid: "test" })
      .setIssuer("https://auth.example")
      .setSubject("user")
      .setAudience("https://mcp.example/mcp")
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(keys.privateKey);
    const config = {
      issuer: "https://auth.example",
      resource: "https://mcp.example/mcp",
      jwks,
    };
    const active = async () => ({
      active: true,
      token_type: "access_token",
      ...claims,
      iss: config.issuer,
      sub: "user",
      aud: config.resource,
    });
    expect(await verifyMcpAccessToken(token, config, active)).toMatchObject({
      subject: "user",
      orgId: "org",
    });
    await expect(
      verifyMcpAccessToken(token, { ...config, resource: "other" }, active),
    ).rejects.toThrow();
    await expect(
      verifyMcpAccessToken(token, config, async () => ({ active: false })),
    ).rejects.toThrow();
    await expect(
      verifyMcpAccessToken(token, config, async () => ({
        ...(await active()),
        org_id: "other",
      })),
    ).rejects.toThrow();
    const noScope = await new SignJWT({ ...claims, scope: "" })
      .setProtectedHeader({ alg: "RS256", kid: "test" })
      .setIssuer(config.issuer)
      .setSubject("user")
      .setAudience(config.resource)
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(keys.privateKey);
    await expect(verifyMcpAccessToken(noScope, config, active)).rejects.toThrow(
      "INSUFFICIENT_SCOPE",
    );
  });
});
