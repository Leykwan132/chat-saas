"use node";

import { createPrivateKey, sign } from "node:crypto";
import { partnerAuthIssuer } from "../partnerAuthConfig";

type PartnerTokenInput = {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profilePictureUrl: string | null;
  hostname: string;
  partnerId: string;
  partnerOrganizationId: string;
};

function getPrivateJwk() {
  const serializedJwk = process.env.PARTNER_AUTH_JWT_PRIVATE_JWK;
  if (serializedJwk === undefined) {
    throw new Error("PARTNER_AUTH_JWT_PRIVATE_JWK is not configured.");
  }
  const privateJwk = JSON.parse(serializedJwk) as JsonWebKey;
  if (
    privateJwk.kty !== "RSA" ||
    typeof privateJwk.n !== "string" ||
    typeof privateJwk.e !== "string" ||
    typeof privateJwk.d !== "string"
  ) {
    throw new Error("PARTNER_AUTH_JWT_PRIVATE_JWK must contain an RSA private JWK.");
  }
  return privateJwk;
}

function getAudience() {
  const audience = process.env.WORKOS_CLIENT_ID;
  if (audience === undefined) throw new Error("WORKOS_CLIENT_ID is not configured.");
  return audience;
}

function encode(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

export function issuePartnerAuthToken(input: PartnerTokenInput) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const unsignedToken = [
    encode({ alg: "RS256", typ: "JWT", kid: "partner-auth-v1" }),
    encode({
      iss: partnerAuthIssuer,
      aud: getAudience(),
      sub: input.userId,
      email: input.email,
      given_name: input.firstName,
      family_name: input.lastName,
      picture: input.profilePictureUrl,
      iat: issuedAt,
      exp: issuedAt + 604_800,
      surface: "partner",
      hostname: input.hostname,
      partnerId: input.partnerId,
      partnerOrganizationId: input.partnerOrganizationId,
    }),
  ].join(".");
  const key = createPrivateKey({ key: getPrivateJwk(), format: "jwk" });
  const signature = sign("RSA-SHA256", Buffer.from(unsignedToken), key).toString("base64url");
  return `${unsignedToken}.${signature}`;
}

export function getPartnerAuthJwks() {
  const privateJwk = getPrivateJwk();
  return {
    keys: [{
      kty: "RSA",
      n: privateJwk.n,
      e: privateJwk.e,
      kid: "partner-auth-v1",
      use: "sig",
      alg: "RS256",
    }],
  };
}
