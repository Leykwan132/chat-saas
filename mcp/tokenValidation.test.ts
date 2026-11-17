import { beforeAll, describe, expect, it } from "vitest";
import {
  createLocalJWKSet,
  decodeJwt,
  exportJWK,
  generateKeyPair,
  SignJWT,
} from "jose";
import { verifyMcpAccessToken } from "./auth";

let keys: Awaited<ReturnType<typeof generateKeyPair>>;
beforeAll(async () => {
  keys = await generateKeyPair("RS256", { extractable: true });
});
describe("invalid OAuth identities", () => {
  it.each([
    ["expired", { exp: 1 }],
    ["wrong issuer", { iss: "https://foreign.example" }],
    ["wrong audience", { aud: "other-api" }],
    ["missing organization", { org_id: undefined }],
    ["missing client", { client_id: undefined }],
    ["missing consent", { sid: undefined }],
    ["agent identity", { sub_profile: "ai_agent" }],
    ["machine identity", { sub: "client_machine" }],
    ["missing scopes", { scope: undefined }],
  ])("rejects %s", async (_label, override) => {
    const resource = "https://mcp.example/mcp";
    const issuer = "https://auth.example";
    const now = Math.floor(Date.now() / 1000);
    const token = await new SignJWT({
      iss: issuer,
      aud: resource,
      sub: "user_test",
      iat: now,
      exp: now + 300,
      org_id: "org",
      sid: "consent",
      client_id: "client",
      scope: "openid",
      ...override,
    })
      .setProtectedHeader({ alg: "RS256", kid: "test" })
      .sign(keys.privateKey);
    const jwks = createLocalJWKSet({
      keys: [{ ...(await exportJWK(keys.publicKey)), kid: "test" }],
    });
    await expect(
      verifyMcpAccessToken(token, { issuer, resource, jwks }, async () => ({
        ...decodeJwt(token),
        active: true,
        token_type: "access_token",
      })),
    ).rejects.toThrow();
  });
});
