import { httpAction } from "./_generated/server";

type TelegramWebhookMetadata = {
  updateId: number | null;
  eventType: string;
  chatId: number | null;
  chatType: string | null;
  senderId: number | null;
  messageText: string | null;
  contact: TelegramContactMetadata | null;
};

type TelegramContactMetadata = {
  phoneNumber: string | null;
  firstName: string | null;
  lastName: string | null;
  userId: number | null;
  hasVcard: boolean;
};

export function requireNotificationBotToken(
  environment: Record<string, string | undefined>,
): string {
  const token = environment.NOTIFICATION_BOT_TOKEN?.trim();
  if (!token) {
    throw new Error("NOTIFICATION_BOT_TOKEN is not configured");
  }
  return token;
}

const TELEGRAM_UPDATE_EVENT_TYPES = [
  "message",
  "edited_message",
  "channel_post",
  "edited_channel_post",
  "callback_query",
  "my_chat_member",
  "chat_member",
  "chat_join_request",
] as const;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function idFrom(value: Record<string, unknown> | null): number | null {
  return asNumber(value?.id);
}

function metadataForEvent(
  event: Record<string, unknown>,
): Omit<TelegramWebhookMetadata, "updateId" | "eventType"> {
  const message = asRecord(event.message);
  const chat = asRecord(event.chat) ?? asRecord(message?.chat);
  const sender = asRecord(event.from) ?? asRecord(message?.from);
  const contact = asRecord(event.contact) ?? asRecord(message?.contact);

  return {
    chatId: idFrom(chat),
    chatType: typeof chat?.type === "string" ? chat.type : null,
    senderId: idFrom(sender),
    messageText:
      typeof event.text === "string"
        ? event.text
        : typeof message?.text === "string"
          ? message.text
          : null,
    contact: contact
      ? {
          phoneNumber: asString(contact.phone_number),
          firstName: asString(contact.first_name),
          lastName: asString(contact.last_name),
          userId: asNumber(contact.user_id),
          hasVcard: typeof contact.vcard === "string" && contact.vcard.length > 0,
        }
      : null,
  };
}

export function extractTelegramWebhookMetadata(
  update: unknown,
): TelegramWebhookMetadata {
  const record = asRecord(update);
  if (!record) {
    return {
      updateId: null,
      eventType: "unknown",
      chatId: null,
      chatType: null,
      senderId: null,
      messageText: null,
      contact: null,
    };
  }

  for (const eventType of TELEGRAM_UPDATE_EVENT_TYPES) {
    const event = asRecord(record[eventType]);
    if (event) {
      return {
        updateId: asNumber(record.update_id),
        eventType,
        ...metadataForEvent(event),
      };
    }
  }

  return {
    updateId: asNumber(record.update_id),
    eventType: "unknown",
    chatId: null,
    chatType: null,
    senderId: null,
    messageText: null,
    contact: null,
  };
}

export async function handleTelegramWebhookRequest(
  request: Request,
  expectedSecret: string | undefined,
  onHiMessage?: (chatId: number) => Promise<void>,
  onContactShared?: (chatId: number) => Promise<void>,
): Promise<Response> {
  if (!expectedSecret) {
    console.error("[telegram-webhook] TELEGRAM_WEBHOOK_SECRET is not configured");
    return new Response("server misconfigured", { status: 500 });
  }

  if (
    request.headers.get("x-telegram-bot-api-secret-token") !== expectedSecret
  ) {
    return new Response("unauthorized", { status: 401 });
  }

  let update: unknown;
  try {
    update = JSON.parse(await request.text()) as unknown;
  } catch {
    return new Response("invalid json", { status: 400 });
  }

  console.log("[telegram-webhook] received request", {
    method: request.method,
    url: request.url,
    contentType: request.headers.get("content-type"),
    userAgent: request.headers.get("user-agent"),
    hasSecretToken: Boolean(
      request.headers.get("x-telegram-bot-api-secret-token"),
    ),
  });
  const metadata = extractTelegramWebhookMetadata(update);
  console.log("[telegram-webhook] received", metadata);
  if (
    onHiMessage &&
    metadata.eventType === "message" &&
    metadata.chatType === "private" &&
    metadata.chatId !== null &&
    metadata.messageText?.trim().toLowerCase() === "hi"
  ) {
    await onHiMessage(metadata.chatId);
  }
  if (
    onContactShared &&
    metadata.eventType === "message" &&
    metadata.chatType === "private" &&
    metadata.chatId !== null &&
    metadata.contact !== null
  ) {
    await onContactShared(metadata.chatId);
  }
  return new Response(null, { status: 200 });
}

export async function sendTelegramContactRequest(
  botToken: string,
  chatId: number,
): Promise<void> {
  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: "Please share your phone number for verification so we can subscribe you to notifications.",
        reply_markup: {
          keyboard: [[{ text: "Share phone number", request_contact: true }]],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }),
    },
  );
  const result = (await response.json()) as {
    ok?: boolean;
    description?: string;
  };
  if (!response.ok || result.ok !== true) {
    throw new Error(
      `Telegram contact request failed: ${result.description ?? response.status}`,
    );
  }
}

export async function sendTelegramNotificationReady(
  botToken: string,
  chatId: number,
): Promise<void> {
  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: "Your notifications are ready!",
      }),
    },
  );
  const result = (await response.json()) as {
    ok?: boolean;
    description?: string;
  };
  if (!response.ok || result.ok !== true) {
    throw new Error(
      `Telegram notification confirmation failed: ${result.description ?? response.status}`,
    );
  }
}

export const telegramWebhook = httpAction(async (_ctx, request) => {
  return await handleTelegramWebhookRequest(
    request,
    process.env.TELEGRAM_WEBHOOK_SECRET,
    async (chatId) => {
      const botToken = requireNotificationBotToken(process.env);
      await sendTelegramContactRequest(botToken, chatId);
    },
    async (chatId) => {
      const botToken = requireNotificationBotToken(process.env);
      await sendTelegramNotificationReady(botToken, chatId);
    },
  );
});
