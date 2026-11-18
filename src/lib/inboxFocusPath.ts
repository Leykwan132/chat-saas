export const INBOX_FOCUS_RETURN_KEY = "kilobot-inbox-focus-return";

export function inboxFocusPath(agentId: string) {
  return `/dashboard/${agentId}/inbox/focus`;
}

export function validInboxFocusReturnPath(path: string | null) {
  if (!path) return null;
  return /^\/dashboard\/[a-zA-Z0-9_-]+\/inbox\/focus\/?(?:\?[^#]*)?$/.test(path)
    ? path
    : null;
}

export function readInboxFocusReturnPath() {
  return validInboxFocusReturnPath(
    sessionStorage.getItem(INBOX_FOCUS_RETURN_KEY),
  );
}
