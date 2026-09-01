import { expect, test } from "vitest";

test("requires explicit issuer and JWKS configuration for partner surface tokens", async () => {
  const config = await import("./partnerAuthConfig");

  expect(() =>
    config.getPartnerAuthJwtProvider({
      PARTNER_AUTH_JWT_ISSUER: "",
      PARTNER_AUTH_JWKS_URL: "https://auth.kilobot.app/_partner-auth/jwks",
      WORKOS_CLIENT_ID: "client_test",
    }),
  ).toThrow("PARTNER_AUTH_JWT_ISSUER is not configured");
});

test("builds a Convex custom JWT provider for Worker surface tokens", async () => {
  const config = await import("./partnerAuthConfig");

  expect(
    config.getPartnerAuthJwtProvider({
      PARTNER_AUTH_JWT_ISSUER: "https://auth.kilobot.app",
      PARTNER_AUTH_JWKS_URL: "https://auth.kilobot.app/_partner-auth/jwks",
      WORKOS_CLIENT_ID: "client_test",
    }),
  ).toEqual({
    type: "customJwt",
    issuer: "https://auth.kilobot.app",
    algorithm: "RS256",
    jwks: "https://auth.kilobot.app/_partner-auth/jwks",
    applicationID: "client_test",
  });
});
