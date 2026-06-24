// Cross-provider helpers for our static-callback OAuth flows (Instagram,
// Messenger, and WhatsApp). Everything in here is plain V8-runtime code with no Convex
// `ctx` dependency, so the same functions can be called from action
// handlers, HTTP route handlers, and tests.

// Only allow return paths inside our own app. We reject absolute URLs,
// protocol-relative URLs ("//evil.com"), and backslash tricks so a
// malicious caller cannot turn the OAuth callback into an open-redirect
// gadget. The HTTP callback prefixes `appBaseUrl()` to the result to
// construct the final `Location` header.
export function sanitizeReturnPath(input: string | undefined): string {
  const fallback = "/workspace";
  if (typeof input !== "string" || input.length === 0) return fallback;
  if (!input.startsWith("/")) return fallback;
  if (input.startsWith("//") || input.startsWith("/\\")) return fallback;
  // Strip any pre-existing query string so the callback can append its own
  // status params (e.g. `?instagram=connected`) cleanly.
  const qIdx = input.indexOf("?");
  return qIdx === -1 ? input : input.slice(0, qIdx);
}

// 32 bytes of crypto-random hex. crypto.getRandomValues is available in the
// default Convex runtime (V8 + Web Crypto), no Node import needed.
export function generateCsrfToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Base64url-encode a UTF-8 string so the encoded `state` parameter can sit
// inside a URL without further percent-escaping.
export function base64UrlEncode(input: string): string {
  const b64 = btoa(input);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function base64UrlDecode(input: string): string {
  const padLen = (4 - (input.length % 4)) % 4;
  const b64 =
    input.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(padLen);
  return atob(b64);
}

// Wraps the JSON-encode → base64url-encode dance for OAuth state values.
// We keep the shape `{ csrf, returnPath }` consistent across providers so a
// single decoder works for every callback route.
export type OAuthStatePayload = { csrf: string; returnPath: string };

export function encodeOAuthState(payload: OAuthStatePayload): string {
  return base64UrlEncode(JSON.stringify(payload));
}

export function decodeOAuthState(
  raw: string | null | undefined,
): OAuthStatePayload | null {
  if (!raw) return null;
  try {
    const decoded = JSON.parse(base64UrlDecode(raw)) as Partial<OAuthStatePayload>;
    if (
      typeof decoded.csrf !== "string" ||
      typeof decoded.returnPath !== "string"
    ) {
      return null;
    }
    return {
      csrf: decoded.csrf,
      returnPath: sanitizeReturnPath(decoded.returnPath),
    };
  } catch {
    return null;
  }
}

// The full origin of the SPA (e.g. http://localhost:5173 or
// https://app.example.com). Used by HTTP callbacks to construct the final
// 302 Location since Convex HTTP runs on a different origin from the SPA.
export function appBaseUrl(): string {
  const raw = process.env.APP_BASE_URL;
  if (!raw) {
    throw new Error("APP_BASE_URL env var is not configured");
  }
  return raw.replace(/\/+$/, "");
}

// Builds a 302 Response that lands the browser back inside the SPA on the
// given path with the supplied query params. Centralised so every OAuth
// callback exits the same way and we never accidentally redirect to an
// absolute URL coming from an untrusted source.
export function redirectResponse(
  returnPath: string,
  params: Record<string, string>,
): Response {
  const safePath = sanitizeReturnPath(returnPath);
  const qs = new URLSearchParams(params).toString();
  const location = `${appBaseUrl()}${safePath}${qs ? `?${qs}` : ""}`;
  return new Response(null, {
    status: 302,
    headers: { Location: location },
  });
}
