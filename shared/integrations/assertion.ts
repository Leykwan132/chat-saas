import {
  createLocalJWKSet,
  importPKCS8,
  jwtVerify,
  SignJWT,
  type JSONWebKeySet,
} from "jose";
import {
  INTEGRATION_PATH,
  integrationRequestSchema,
  REQUEST_LIMIT,
} from "./contracts";
import { readBoundedBody } from "./body";

export async function bodyHash(body: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(body),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export async function signIntegrationRequest(
  body: string,
  privateKey: string,
  kid: string,
  environment: string,
) {
  return new SignJWT({
    method: "POST",
    path: INTEGRATION_PATH,
    bodyHash: await bodyHash(body),
    environment,
  })
    .setProtectedHeader({ alg: "RS256", kid, typ: "JWT" })
    .setIssuer("kilobot-integration-gateway")
    .setAudience("kilobot-integration-api")
    .setIssuedAt()
    .setExpirationTime("30s")
    .setJti(crypto.randomUUID())
    .sign(await importPKCS8(privateKey, "RS256"));
}

export async function verifyIntegrationRequest(
  request: Request,
  config: { jwks: JSONWebKeySet; environment: string },
) {
  if (
    request.method !== "POST" ||
    new URL(request.url).pathname !== INTEGRATION_PATH
  )
    throw new Error("Invalid integration route");
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer (\S+)$/)?.[1];
  if (!token) throw new Error("Missing service authentication");
  const { payload } = await jwtVerify(token, createLocalJWKSet(config.jwks), {
    issuer: "kilobot-integration-gateway",
    audience: "kilobot-integration-api",
    algorithms: ["RS256"],
    requiredClaims: ["iat", "exp", "jti"],
    clockTolerance: 5,
    maxTokenAge: "35s",
  });
  const body = await readBoundedBody(request, REQUEST_LIMIT);
  if (
    payload.method !== request.method ||
    payload.path !== INTEGRATION_PATH ||
    payload.environment !== config.environment ||
    payload.bodyHash !== (await bodyHash(body)) ||
    typeof payload.iat !== "number" ||
    typeof payload.exp !== "number" ||
    payload.exp - payload.iat > 30 ||
    payload.exp <= payload.iat ||
    typeof payload.jti !== "string" ||
    !payload.jti
  )
    throw new Error("Invalid service assertion");
  return {
    ...integrationRequestSchema.parse(JSON.parse(body)),
    requestId: payload.jti,
  };
}
