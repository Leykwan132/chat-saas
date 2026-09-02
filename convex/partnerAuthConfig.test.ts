import { expect, test } from "vitest";

test("requires the existing Convex site URL for partner surface tokens", async () => {
  const config = await import("./partnerAuthConfig");

  expect(() =>
    config.getPartnerAuthJwtProvider({
      WORKOS_CLIENT_ID: "client_test",
    }),
  ).toThrow("CONVEX_SITE_URL is not configured");
});

test("builds a Convex custom JWT provider for partner surface tokens", async () => {
  const config = await import("./partnerAuthConfig");

  expect(
    config.getPartnerAuthJwtProvider({
      CONVEX_SITE_URL: "https://example.convex.site/",
      WORKOS_CLIENT_ID: "client_test",
    }),
  ).toEqual({
    type: "customJwt",
    issuer: "https://example.convex.site/partner-auth",
    algorithm: "RS256",
    jwks: "https://example.convex.site/partner-auth/jwks",
    applicationID: "client_test",
  });
});
