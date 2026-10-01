import { expect, test } from "vitest";
import { notificationBotIdForRecipient, resolveNotificationBot } from "./config";

test("uses the GoEcho bot credentials for the GoEcho custom hostname", () => {
  expect(resolveNotificationBot("chat.gosolutions.sg", {
    GOECHO_NOTIFICATION_BOT_TOKEN: "goecho-token",
    GOECHO_NOTIFICATION_BOT_USERNAME: "@goecho_notifications",
  })).toEqual({
    id: "goecho",
    token: "goecho-token",
    username: "goecho_notifications",
  });
});

test("uses the KiloBot credentials for other hostnames", () => {
  expect(resolveNotificationBot("kilobot.app", {
    NOTIFICATION_BOT_TOKEN: "kilobot-token",
    NOTIFICATION_BOT_USERNAME: "@notifications_kilobot",
  })).toEqual({
    id: "kilobot",
    token: "kilobot-token",
    username: "notifications_kilobot",
  });
});

test("treats recipients created before bot routing as KiloBot recipients", () => {
  expect(notificationBotIdForRecipient(undefined)).toBe("kilobot");
});
