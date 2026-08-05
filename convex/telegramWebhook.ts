import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireNotificationBotToken } from "./telegramNotifications/config";
import { sendTelegramMessage } from "./telegramNotifications/telegramApi";
import { parseTelegramUpdate, startToken } from "./telegramNotifications/updateParser";
import { hashVerificationToken } from "./telegramNotifications/token";

const invalidLinkMessage = "This verification link is invalid. Please generate a new link from KiloBot.";

export async function handleTelegramWebhookRequest(
  request: Request,
  expectedSecret: string | undefined,
  operations: {
    bindVerificationChat: (tokenHash: string, chatId: string) => Promise<boolean>;
    verifySharedContact: (input: {
      chatId: string;
      senderId: string;
      contactUserId: string | undefined;
      phoneNumber: string;
      firstName: string | undefined;
      lastName: string | undefined;
    }) => Promise<boolean>;
    sendMessage: (chatId: string, text: string, replyMarkup?: Record<string, unknown>) => Promise<void>;
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
    const accepted = await operations.bindVerificationChat(await hashVerificationToken(rawToken), parsed.chatId);
    if (!accepted) {
      await operations.sendMessage(parsed.chatId, invalidLinkMessage);
    } else {
      await operations.sendMessage(
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
    const verified = await operations.verifySharedContact({
      chatId: parsed.chatId,
      senderId: parsed.senderId,
      contactUserId: parsed.contact.userId,
      phoneNumber: parsed.contact.phoneNumber,
      firstName: parsed.contact.firstName,
      lastName: parsed.contact.lastName,
    });
    if (verified) await operations.sendMessage(parsed.chatId, "Your notifications are ready!");
  }
  return new Response(null, { status: 200 });
}

export const telegramWebhook = httpAction(async (ctx, request) => {
  const botToken = requireNotificationBotToken(process.env);
  return await handleTelegramWebhookRequest(request, process.env.TELEGRAM_WEBHOOK_SECRET, {
    bindVerificationChat: async (tokenHash, chatId) =>
      (await ctx.runMutation(internal.telegramNotifications.verification.bindVerificationChat, { tokenHash, chatId })).accepted,
    verifySharedContact: async (input) =>
      (await ctx.runMutation(internal.telegramNotifications.verification.verifySharedContact, input)).verified,
    sendMessage: async (chatId, text, replyMarkup) => {
      await sendTelegramMessage(botToken, { chatId, text, replyMarkup });
    },
  });
});
