export type TelegramPrivateMessageUpdate = {
  updateId: number | null;
  chatId: string;
  chatType: string;
  senderId: string;
  text: string | null;
  contact: {
    phoneNumber: string;
    firstName: string | undefined;
    lastName: string | undefined;
    userId: string | undefined;
  } | null;
};

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function id(value: unknown): string | null {
  return typeof value === "number" || typeof value === "string" ? String(value) : null;
}

export function parseTelegramUpdate(update: unknown): TelegramPrivateMessageUpdate | null {
  const root = record(update);
  const message = record(root?.message);
  const chat = record(message?.chat);
  const sender = record(message?.from);
  const chatId = id(chat?.id);
  const senderId = id(sender?.id);
  const chatType = typeof chat?.type === "string" ? chat.type : null;
  if (!root || !message || !chatId || !senderId || !chatType) return null;

  const rawContact = record(message.contact);
  const phoneNumber = typeof rawContact?.phone_number === "string" ? rawContact.phone_number : null;
  return {
    updateId: typeof root.update_id === "number" ? root.update_id : null,
    chatId,
    chatType,
    senderId,
    text: typeof message.text === "string" ? message.text : null,
    contact: phoneNumber
      ? {
          phoneNumber,
          firstName: typeof rawContact?.first_name === "string" ? rawContact.first_name : undefined,
          lastName: typeof rawContact?.last_name === "string" ? rawContact.last_name : undefined,
          userId: id(rawContact?.user_id) ?? undefined,
        }
      : null,
  };
}

export function startToken(text: string | null): string | null {
  const match = text?.trim().match(/^\/start(?:@\w+)?\s+([A-Za-z0-9_-]{1,128})$/);
  return match?.[1] ?? null;
}
