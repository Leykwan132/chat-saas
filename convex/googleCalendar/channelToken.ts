function encodeBase64Url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeBase64Url(value: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return undefined;
  const padding = "=".repeat((4 - value.length % 4) % 4);
  try {
    return Uint8Array.from(
      atob(value.replace(/-/g, "+").replace(/_/g, "/") + padding),
      (character) => character.charCodeAt(0),
    );
  } catch {
    return undefined;
  }
}

export function constantTimeDigestEqual(leftEncoded: string, rightEncoded: string) {
  const left = decodeBase64Url(leftEncoded) ?? new Uint8Array(0);
  const right = decodeBase64Url(rightEncoded) ?? new Uint8Array(0);
  const length = Math.max(left.length, right.length, 32);
  let difference = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return difference === 0 && left.length === 32;
}

export async function hashGoogleCalendarChannelToken(token: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return encodeBase64Url(new Uint8Array(digest));
}

export async function createGoogleCalendarChannelToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const token = encodeBase64Url(bytes);
  return {
    token,
    tokenHash: await hashGoogleCalendarChannelToken(token),
  };
}
