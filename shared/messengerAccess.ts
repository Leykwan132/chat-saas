const MESSENGER_ALLOWED_EMAIL = "leykwan132@gmail.com";

export function isMessengerUserAllowed(email: string | null | undefined) {
  return email?.trim().toLowerCase() === MESSENGER_ALLOWED_EMAIL;
}

export function assertMessengerConnectAllowed(email: string | null | undefined) {
  if (!isMessengerUserAllowed(email)) {
    throw new Error("Messenger is not available for this account.");
  }
}
