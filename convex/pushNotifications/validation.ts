export function validatePushEndpoint(value: string) {
  const url = new URL(value);
  const allowed =
    url.hostname === "fcm.googleapis.com" ||
    url.hostname === "updates.push.services.mozilla.com" ||
    url.hostname === "web.push.apple.com" ||
    url.hostname.endsWith(".notify.windows.com");
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    !allowed ||
    value.length > 2048
  ) {
    throw new Error("Unsupported push service endpoint");
  }
}

export function validatePushKeys(p256dh: string, auth: string) {
  if (
    !/^[A-Za-z0-9_-]{87}$/.test(p256dh) ||
    !/^[A-Za-z0-9_-]{22}$/.test(auth)
  ) {
    throw new Error("Invalid push subscription encryption keys");
  }
}

export function nativePushOrigin(value: string) {
  const url = new URL(value);
  const base = process.env.APP_BASE_URL;
  if (!base) throw new Error("APP_BASE_URL is not configured");
  const allowed = new URL(base).origin;
  const local = process.env.WEB_PUSH_LOCAL_ORIGIN;
  if (url.origin !== value || (value !== allowed && value !== local)) {
    throw new Error("Invalid notification origin");
  }
  return url.origin;
}
