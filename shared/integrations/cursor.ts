import { jwtVerify, SignJWT } from "jose";
import { bodyHash } from "./assertion";
import type { IntegrationOperation, VerifiedMcpPrincipal } from "./contracts";

function key(secret: string) {
  if (secret.length < 32)
    throw new Error(
      "INTEGRATION_CURSOR_SECRET requires at least 32 characters",
    );
  return new TextEncoder().encode(secret);
}
async function binding(
  principal: VerifiedMcpPrincipal,
  operation: IntegrationOperation,
) {
  const input = { ...operation };
  if ("cursor" in input) delete input.cursor;
  if ("agentCursor" in input) delete input.agentCursor;
  return bodyHash(
    JSON.stringify({
      issuer: principal.issuer,
      subject: principal.subject,
      consentId: principal.consentId,
      orgId: principal.orgId,
      clientId: principal.clientId,
      input,
    }),
  );
}
export async function wrapCursor(
  raw: string,
  principal: VerifiedMcpPrincipal,
  operation: IntegrationOperation,
  secret: string,
) {
  return new SignJWT({
    cursor: raw,
    binding: await binding(principal, operation),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience("kilobot-integration-cursor")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(key(secret));
}
export async function unwrapCursor(
  token: string,
  principal: VerifiedMcpPrincipal,
  operation: IntegrationOperation,
  secret: string,
) {
  const { payload } = await jwtVerify(token, key(secret), {
    algorithms: ["HS256"],
    audience: "kilobot-integration-cursor",
    requiredClaims: ["exp", "iat"],
  });
  if (
    payload.binding !== (await binding(principal, operation)) ||
    typeof payload.cursor !== "string"
  )
    throw new Error("Invalid cursor");
  return payload.cursor;
}
