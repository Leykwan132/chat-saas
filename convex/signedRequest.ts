// Parser + HMAC verifier for Meta's `signed_request` payload.
//
// Format: `<sig_b64url>.<payload_b64url>`
//   - payload_b64url is base64url(JSON({ user_id, algorithm, issued_at, ... }))
//   - sig_b64url is base64url(HMAC-SHA256(payload_b64url, app_secret))
//
// IMPORTANT: the HMAC is computed over the raw base64url payload STRING,
// NOT the decoded JSON. Recomputing over the JSON will silently
// authenticate forged payloads.
//
// Used by:
//   - /auth/instagram/deauthorize    (signed with INSTAGRAM_APP_SECRET)
//   - /auth/instagram/data-deletion  (signed with INSTAGRAM_APP_SECRET)
//   - /auth/messenger/deauthorize    (signed with META_APP_SECRET)
//   - /auth/messenger/data-deletion  (signed with META_APP_SECRET)

import { base64UrlDecode } from "./oauthShared";

export type SignedRequestPayload = {
  algorithm?: string;
  issued_at?: number;
  user_id?: string;
  [key: string]: unknown;
};

export async function parseAndVerifySignedRequest(
  signedRequest: string,
  appSecret: string,
): Promise<SignedRequestPayload | null> {
  const dot = signedRequest.indexOf(".");
  if (dot < 1 || dot === signedRequest.length - 1) return null;
  const sigB64 = signedRequest.slice(0, dot);
  const payloadB64 = signedRequest.slice(dot + 1);

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expectedBytes = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, enc.encode(payloadB64)),
  );
  const expectedB64 = bytesToBase64Url(expectedBytes);
  if (!timingSafeEqual(expectedB64, sigB64)) return null;

  let payload: SignedRequestPayload;
  try {
    payload = JSON.parse(base64UrlDecode(payloadB64)) as SignedRequestPayload;
  } catch {
    return null;
  }
  if (payload.algorithm && payload.algorithm.toUpperCase() !== "HMAC-SHA256") {
    return null;
  }
  return payload;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// Generates a confirmation code for data-deletion responses. Meta echoes
// this back to the user as proof of receipt; we surface it on a status
// page so users can check progress.
export function generateConfirmationCode(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
