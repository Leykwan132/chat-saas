import { httpAction } from "./_generated/server";

type TelegramWebhookMetadata = {
  updateId: number | null;
  eventType: string;
  chatId: number | null;
  senderId: number | null;
  messageText: string | null;
};

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

function idFrom(value: Record<string, unknown> | null): number | null {
  return asNumber(value?.id);
}

function metadataForEvent(
  event: Record<string, unknown>,
): Omit<TelegramWebhookMetadata, "updateId" | "eventType"> {
  const message = asRecord(event.message);
  const chat = asRecord(event.chat) ?? asRecord(message?.chat);
  const sender = asRecord(event.from) ?? asRecord(message?.from);

  return {
    chatId: idFrom(chat),
    senderId: idFrom(sender),
    messageText:
      typeof event.text === "string"
        ? event.text
        : typeof message?.text === "string"
          ? message.text
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
      senderId: null,
      messageText: null,
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
    senderId: null,
    messageText: null,
  };
}

export async function handleTelegramWebhookRequest(
  request: Request,
  expectedSecret: string | undefined,
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
  console.log("[telegram-webhook] received", extractTelegramWebhookMetadata(update));
  return new Response(null, { status: 200 });
}

export const telegramWebhook = httpAction(async (_ctx, request) => {
  return await handleTelegramWebhookRequest(
    request,
    process.env.TELEGRAM_WEBHOOK_SECRET,
  );
});
