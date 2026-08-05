export type TelegramSendRequest = {
  chatId: string;
  text: string;
  replyMarkup?: Record<string, unknown>;
};

export class TelegramDeliveryError extends Error {
  constructor(
    public readonly kind: "blocked" | "unavailable" | "transient" | "permanent",
    message: string,
  ) {
    super(message);
  }
}

function classify(status: number, description: string | undefined) {
  const detail = description?.toLowerCase() ?? "";
  if (status === 429 || status >= 500) return "transient" as const;
  if (detail.includes("bot was blocked")) return "blocked" as const;
  if (detail.includes("chat not found") || detail.includes("user is deactivated")) {
    return "unavailable" as const;
  }
  return "permanent" as const;
}

export async function sendTelegramMessage(
  botToken: string,
  request: TelegramSendRequest,
): Promise<{ messageId?: number }> {
  let response: Response;
  try {
    response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: request.chatId,
        text: request.text,
        ...(request.replyMarkup ? { reply_markup: request.replyMarkup } : {}),
      }),
    });
  } catch {
    throw new TelegramDeliveryError("transient", "Telegram request failed");
  }
  const payload = (await response.json()) as {
    ok?: boolean;
    result?: { message_id?: number };
    description?: string;
  };
  if (!response.ok || payload.ok !== true) {
    throw new TelegramDeliveryError(classify(response.status, payload.description), "Telegram delivery failed");
  }
  return { messageId: payload.result?.message_id };
}
