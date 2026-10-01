import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  resolveNotificationBotById,
  type NotificationBotId,
} from "./telegramNotifications/config";
import { sendTelegramMessage } from "./telegramNotifications/telegramApi";
import { parseTelegramUpdate, startToken } from "./telegramNotifications/updateParser";
import { hashVerificationToken } from "./telegramNotifications/token";

const invalidLinkMessage = "This verification link is invalid. Please generate a new link from your notification bot.";

export async function handleTelegramWebhookRequest(
  request: Request,
  expectedSecret: string | undefined,
  sourceBot: NotificationBotId,
  operations: {
    bindVerificationChat: (tokenHash: string, chatId: string, notificationBot: NotificationBotId) => Promise<NotificationBotId | null>;
    verifySharedContact: (input: {
      chatId: string;
      senderId: string;
      contactUserId: string | undefined;
      phoneNumber: string;
      firstName: string | undefined;
      lastName: string | undefined;
      notificationBot: NotificationBotId;
    }) => Promise<NotificationBotId | null>;
    sendMessage: (notificationBot: NotificationBotId, chatId: string, text: string, replyMarkup?: Record<string, unknown>) => Promise<void>;
  },
): Promise<Response> {
  if (!expectedSecret) return new Response("server misconfigured", { status: 500 });
  if (request.headers.get("x-telegram-bot-api-secret-token") !== expectedSecret) {
    return new Response("unauthorized", { status: 401 });
  }
  let update: unknown;
  try {
    update = JSON.parse(await request.text()) as unknown;
  } catch {
    return new Response("invalid json", { status: 400 });
  }
  const parsed = parseTelegramUpdate(update);
  console.log("[telegram-webhook] received", {
    updateId: parsed?.updateId ?? null,
    eventKind: parsed ? "message" : "unknown",
    isPrivate: parsed?.chatType === "private",
    hasContact: Boolean(parsed?.contact),
  });
  if (!parsed || parsed.chatType !== "private") return new Response(null, { status: 200 });

  const rawToken = startToken(parsed.text);
  if (rawToken) {
    const notificationBot = await operations.bindVerificationChat(
      await hashVerificationToken(rawToken),
      parsed.chatId,
      sourceBot,
    );
    if (!notificationBot) {
      await operations.sendMessage(sourceBot, parsed.chatId, invalidLinkMessage);
    } else {
      await operations.sendMessage(
        notificationBot,
        parsed.chatId,
        "To subscribe to notifications, please share the phone number you want to verify.",
        {
          keyboard: [[{ text: "Share phone number", request_contact: true }]],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      );
    }
  } else if (parsed.contact) {
    const notificationBot = await operations.verifySharedContact({
      chatId: parsed.chatId,
      senderId: parsed.senderId,
      contactUserId: parsed.contact.userId,
      phoneNumber: parsed.contact.phoneNumber,
      firstName: parsed.contact.firstName,
      lastName: parsed.contact.lastName,
      notificationBot: sourceBot,
    });
    if (notificationBot) await operations.sendMessage(notificationBot, parsed.chatId, "Your notifications are ready!");
  }
  return new Response(null, { status: 200 });
}

function telegramWebhookForBot(sourceBot: NotificationBotId) {
  return httpAction(async (ctx, request) => await handleTelegramWebhookRequest(
    request,
    process.env.TELEGRAM_WEBHOOK_SECRET,
    sourceBot,
    {
      bindVerificationChat: async (tokenHash, chatId, notificationBot) => {
        const result = await ctx.runMutation(internal.telegramNotifications.verification.bindVerificationChat, {
          tokenHash,
          chatId,
          notificationBot,
        });
        return result.accepted ? result.notificationBot ?? null : null;
      },
      verifySharedContact: async (input) => {
        const result = await ctx.runMutation(internal.telegramNotifications.verification.verifySharedContact, input);
        return result.verified ? result.notificationBot ?? null : null;
      },
      sendMessage: async (notificationBot, chatId, text, replyMarkup) => {
        await sendTelegramMessage(resolveNotificationBotById(notificationBot, process.env).token, {
          chatId,
          text,
          replyMarkup,
        });
      },
    },
  ));
}

export const telegramWebhook = telegramWebhookForBot("kilobot");
export const goEchoTelegramWebhook = telegramWebhookForBot("goecho");
