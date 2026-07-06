const ADMIN_SESSION_STORAGE_KEY = 'adminSession';
const LEGACY_ADMIN_SESSION_STORAGE_KEY = 'adminContactSession';

export type AdminSession = {
  token: string;
  expiresAt: number;
};

function parseStoredSession(raw: string | null): AdminSession | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as AdminSession;
    if (!parsed.token || !parsed.expiresAt || parsed.expiresAt <= Date.now()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function loadStoredAdminSession(): AdminSession | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const session =
    parseStoredSession(window.sessionStorage.getItem(ADMIN_SESSION_STORAGE_KEY)) ??
    parseStoredSession(window.sessionStorage.getItem(LEGACY_ADMIN_SESSION_STORAGE_KEY));

  if (!session) {
    clearStoredAdminSession();
    return null;
  }

  storeAdminSession(session);
  return session;
}

export function storeAdminSession(session: AdminSession) {
  window.sessionStorage.setItem(ADMIN_SESSION_STORAGE_KEY, JSON.stringify(session));
  window.sessionStorage.removeItem(LEGACY_ADMIN_SESSION_STORAGE_KEY);
}

export function clearStoredAdminSession() {
  window.sessionStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
  window.sessionStorage.removeItem(LEGACY_ADMIN_SESSION_STORAGE_KEY);
}
