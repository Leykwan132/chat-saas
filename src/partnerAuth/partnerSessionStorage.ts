import type { AppAuthUser } from "./AppAuthProvider";

const storageKey = "kilobot.partnerSession";

export type StoredPartnerSession = {
  token: string;
  user: AppAuthUser;
};

function getTokenExpiry(token: string) {
  const payload = token.split(".")[1];
  if (payload === undefined) return null;

  try {
    const base64 = payload.replaceAll("-", "+").replaceAll("_", "/");
    const decoded = JSON.parse(atob(base64)) as { exp?: unknown };
    return typeof decoded.exp === "number" ? decoded.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function loadPartnerSession() {
  const serializedSession = window.localStorage.getItem(storageKey);
  if (serializedSession === null) return null;

  try {
    const session = JSON.parse(serializedSession) as StoredPartnerSession;
    const expiresAt = getTokenExpiry(session.token);
    if (expiresAt === null || expiresAt <= Date.now()) {
      window.localStorage.removeItem(storageKey);
      return null;
    }
    return { session, expiresAt };
  } catch {
    window.localStorage.removeItem(storageKey);
    return null;
  }
}

export function savePartnerSession(session: StoredPartnerSession) {
  window.localStorage.setItem(storageKey, JSON.stringify(session));
}

export function clearPartnerSession() {
  window.localStorage.removeItem(storageKey);
}
