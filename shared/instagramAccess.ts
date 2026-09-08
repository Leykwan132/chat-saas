const INSTAGRAM_ALLOWED_EMAIL = "leykwan132@gmail.com";

export function isInstagramUserAllowed(email: string | null | undefined) {
  return email?.trim().toLowerCase() === INSTAGRAM_ALLOWED_EMAIL;
}

export function assertInstagramConnectAllowed(email: string | null | undefined) {
  if (!isInstagramUserAllowed(email)) {
    throw new Error("Instagram is not available for this account.");
  }
}
