export type NotificationBotId = "kilobot" | "goecho";

type Environment = Record<string, string | undefined>;

export type NotificationBot = {
  id: NotificationBotId;
  token: string;
  username: string;
};

export function notificationBotIdForRecipient(notificationBot: NotificationBotId | undefined): NotificationBotId {
  return notificationBot ?? "kilobot";
}

function requiredValue(environment: Environment, name: string) {
  const value = environment[name]?.trim();
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export function resolveNotificationBot(hostname: string | undefined, environment: Environment): NotificationBot {
  if (hostname?.trim().toLowerCase() === "chat.gosolutions.sg") {
    return resolveNotificationBotById("goecho", environment);
  }
  return resolveNotificationBotById("kilobot", environment);
}

export function resolveNotificationBotById(id: NotificationBotId, environment: Environment): NotificationBot {
  const prefix = id === "goecho" ? "GOECHO_NOTIFICATION_BOT" : "NOTIFICATION_BOT";
  return {
    id,
    token: requiredValue(environment, `${prefix}_TOKEN`),
    username: requiredValue(environment, `${prefix}_USERNAME`).replace(/^@/, ""),
  };
}

export function buildTelegramVerificationUrl(username: string, rawToken: string): string {
  return `https://t.me/${username}?start=${rawToken}`;
}
