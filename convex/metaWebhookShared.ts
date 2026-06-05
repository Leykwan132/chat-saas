// Helpers shared across all Meta-platform webhooks (WhatsApp, Instagram,
// Messenger) that hit POST /webhook/meta. They split the boilerplate of
// "validate HMAC and parse JSON" away from the per-platform dispatchers.

export type MetaWebhookEnvelope = {
  object?: string;
  entry?: Array<Record<string, unknown>>;
};

export async function verifyMetaSignature(
  req: Request,
  rawBody: string,
  appSecretOverride?: string,
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const appSecret = appSecretOverride ?? process.env.META_APP_SECRET;
  if (!appSecret) {
    console.error("Meta app secret is not configured");
    return { ok: false, status: 500, message: "server misconfigured" };
  }
  const sigHeader = req.headers.get("x-hub-signature-256");
  if (!sigHeader || !sigHeader.startsWith("sha256=")) {
    return { ok: false, status: 400, message: "missing signature" };
  }
  const providedHex = sigHeader.slice("sha256=".length);
  console.log("providedHex", providedHex);
  const valid = await verifyHmac(appSecret, rawBody, providedHex);
  console.log("valid", valid);
  if (!valid) {
    return { ok: false, status: 401, message: "invalid signature" };
  }
  return { ok: true };
}

async function verifyHmac(
  secret: string,
  body: string,
  providedHex: string,
): Promise<boolean> {
  console.log("secret", secret);
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  console.log("sig", sig);
  console.log("providedHex", providedHex);
  const expectedHex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  console.log("expectedHex", expectedHex);

  return timingSafeEqualHex(expectedHex, providedHex.toLowerCase());
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
