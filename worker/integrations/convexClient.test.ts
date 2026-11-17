import { afterEach, expect, it, vi } from "vitest";
import { exportPKCS8, generateKeyPair } from "jose";
import { callIntegrationBackend } from "./convexClient";

afterEach(() => {
  vi.unstubAllGlobals();
});
it("uses Workers-supported manual redirects and never follows a redirect with credentials", async () => {
  const keys = await generateKeyPair("RS256", { extractable: true });
  const fetchMock = vi.fn(
    async (url: RequestInfo | URL, options?: RequestInit) => {
      expect(String(url)).toContain("/integrations/mcp/read");
      expect(options?.headers).toBeDefined();
      return new Response(null, {
        status: 302,
        headers: { location: "https://foreign.example" },
      });
    },
  );
  vi.stubGlobal("fetch", fetchMock);
  await expect(
    callIntegrationBackend(
      {
        principal: {
          issuer: "https://auth.example",
          subject: "user_test",
          orgId: "org",
          consentId: "consent",
          clientId: "client",
          grantedScopes: ["openid"],
        },
        operation: { operation: "get_connection_context", agentLimit: 10 },
      },
      {
        INTEGRATION_ENABLED: "true",
        INTEGRATION_ENVIRONMENT: "test",
        INTEGRATION_KEY_ID: "test",
        INTEGRATION_SIGNING_KEY: await exportPKCS8(keys.privateKey),
        CONVEX_INTEGRATION_URL: "https://backend.example/integrations/mcp/read",
      },
    ),
  ).rejects.toThrow("BACKEND_REDIRECT_DENIED");
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock.mock.calls[0][1]).toMatchObject({ redirect: "manual" });
});
