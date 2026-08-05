import { afterEach, expect, test, vi } from "vitest";
import {
  handleTelegramWebhookRequest,
  sendTelegramContactRequest,
} from "./telegramWebhook";

afterEach(() => {
  vi.restoreAllMocks();
});

test("logs request details and message text for an authenticated update", async () => {
  const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

  const response = await handleTelegramWebhookRequest(
    new Request("https://example.com/webhook/telegram", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-telegram-bot-api-secret-token": "test-secret",
      },
      body: JSON.stringify({
        update_id: 101,
        message: {
          message_id: 2,
          text: "private message",
          chat: { id: 300, type: "private" },
          from: { id: 400 },
        },
      }),
    }),
    "test-secret",
  );

  expect(response.status).toBe(200);
  expect(log).toHaveBeenCalledTimes(2);
  expect(log).toHaveBeenNthCalledWith(
    1,
    "[telegram-webhook] received request",
    {
      method: "POST",
      url: "https://example.com/webhook/telegram",
      contentType: "application/json",
      userAgent: null,
      hasSecretToken: true,
    },
  );
  expect(log).toHaveBeenNthCalledWith(2, "[telegram-webhook] received", {
    updateId: 101,
      eventType: "message",
      chatId: 300,
      chatType: "private",
      senderId: 400,
      messageText: "private message",
    });
});

test("requests contact details when a private user says Hi", async () => {
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  const requestContact = vi.fn().mockResolvedValue(undefined);

  const response = await handleTelegramWebhookRequest(
    new Request("https://example.com/webhook/telegram", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-telegram-bot-api-secret-token": "test-secret",
      },
      body: JSON.stringify({
        update_id: 102,
        message: {
          message_id: 3,
          text: "Hi",
          chat: { id: 301, type: "private" },
          from: { id: 401 },
        },
      }),
    }),
    "test-secret",
    requestContact,
  );

  expect(response.status).toBe(200);
  expect(requestContact).toHaveBeenCalledWith(301);
});

test("sends a contact-sharing keyboard through Telegram", async () => {
  const fetchMock = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

  await sendTelegramContactRequest("test-bot-token", 301);

  const [url, options] = fetchMock.mock.calls[0];
  expect(url).toBe(
    "https://api.telegram.org/bottest-bot-token/sendMessage",
  );
  expect(options?.method).toBe("POST");
  expect(JSON.parse(String(options?.body))).toEqual({
    chat_id: 301,
    text: "Please share your phone number so I can continue.",
    reply_markup: {
      keyboard: [[{ text: "Share phone number", request_contact: true }]],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  });
});

test("rejects a request whose secret header does not match", async () => {
  const response = await handleTelegramWebhookRequest(
    new Request("https://example.com/webhook/telegram", { method: "POST" }),
    "test-secret",
  );

  expect(response.status).toBe(401);
});

test("rejects malformed JSON after authenticating the request", async () => {
  const response = await handleTelegramWebhookRequest(
    new Request("https://example.com/webhook/telegram", {
      method: "POST",
      headers: { "x-telegram-bot-api-secret-token": "test-secret" },
      body: "{",
    }),
    "test-secret",
  );

  expect(response.status).toBe(400);
});

test("fails closed when the server secret is not configured", async () => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);

  const response = await handleTelegramWebhookRequest(
    new Request("https://example.com/webhook/telegram", { method: "POST" }),
    undefined,
  );

  expect(response.status).toBe(500);
});
