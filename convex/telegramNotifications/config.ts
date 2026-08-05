export function requireNotificationBotUsername(
  environment: Record<string, string | undefined>,
): string {
  const username = environment.NOTIFICATION_BOT_USERNAME?.trim().replace(/^@/, "");
  if (!username) {
    throw new Error("NOTIFICATION_BOT_USERNAME is not configured");
  }
  return username;
}

export function requireNotificationBotToken(
  environment: Record<string, string | undefined>,
): string {
  const token = environment.NOTIFICATION_BOT_TOKEN?.trim();
  if (!token) {
    throw new Error("NOTIFICATION_BOT_TOKEN is not configured");
  }
  return token;
}

export function buildTelegramVerificationUrl(username: string, rawToken: string): string {
  return `https://t.me/${username}?start=${rawToken}`;
}
