import { v } from "convex/values";

export const telegramRecipientStatusValidator = v.union(
  v.literal("pending"),
  v.literal("verified"),
  v.literal("blocked"),
);

export const telegramSubscriptionStatusValidator = v.union(
  v.literal("enabled"),
  v.literal("disabled"),
);

export const notificationBotIdValidator = v.union(
  v.literal("kilobot"),
  v.literal("goecho"),
);

export const notificationButtonsValidator = v.array(v.object({ text: v.string(), url: v.string() }));
