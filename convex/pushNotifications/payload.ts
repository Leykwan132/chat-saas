import { v } from "convex/values";
import { telegramNotificationKindValidator } from "../telegramNotifications/kinds";
import type { TelegramNotificationKind } from "../../shared/telegramNotificationKinds";

export const pushEventValidator = v.object({
  kind: telegramNotificationKindValidator,
  eventKey: v.string(),
  title: v.string(),
  body: v.string(),
  path: v.string(),
});

export type PushEvent = {
  kind: TelegramNotificationKind;
  eventKey: string;
  title: string;
  body: string;
  path: string;
};
