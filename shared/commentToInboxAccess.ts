const COMMENT_TO_INBOX_ALLOWED_EMAIL = "leykwan132@gmail.com";

export function isCommentToInboxUserAllowed(
  email: string | null | undefined,
) {
  return email?.trim().toLowerCase() === COMMENT_TO_INBOX_ALLOWED_EMAIL;
}
