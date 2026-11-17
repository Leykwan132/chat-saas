import { expect, it } from "vitest";
import { unwrapCursor, wrapCursor } from "./cursor";

it("binds pagination to consent, workspace and exact search", async () => {
  const principal = {
    issuer: "https://auth.example",
    subject: "user",
    orgId: "org",
    consentId: "consent",
    clientId: "client",
    grantedScopes: [],
  };
  const operation = {
    operation: "search_conversations" as const,
    agentId: "agent",
    query: "refund",
    limit: 10,
  };
  const secret = "test-secret-with-at-least-32-characters";
  const token = await wrapCursor(
    "database-cursor",
    principal,
    operation,
    secret,
  );
  expect(await unwrapCursor(token, principal, operation, secret)).toBe(
    "database-cursor",
  );
  await expect(
    unwrapCursor(token, { ...principal, orgId: "other" }, operation, secret),
  ).rejects.toThrow();
  await expect(
    unwrapCursor(token, principal, { ...operation, query: "other" }, secret),
  ).rejects.toThrow();
});
