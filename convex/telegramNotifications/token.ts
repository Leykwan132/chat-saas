function bytesToBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export async function hashVerificationToken(rawToken: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(rawToken),
  );
  return bytesToBase64Url(new Uint8Array(digest));
}

export async function createVerificationToken(): Promise<{
  rawToken: string;
  tokenHash: string;
}> {
  const rawToken = bytesToBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  return { rawToken, tokenHash: await hashVerificationToken(rawToken) };
}
