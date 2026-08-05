import { afterEach, expect, test, vi } from "vitest";
import {
  handleTelegramWebhookRequest,
  sendTelegramContactRequest,
  sendTelegramNotificationReady,
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
    contact: null,
  });
});

test("logs contact data when a user shares their phone number", async () => {
  const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

  const response = await handleTelegramWebhookRequest(
    new Request("https://example.com/webhook/telegram", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-telegram-bot-api-secret-token": "test-secret",
      },
      body: JSON.stringify({
        update_id: 103,
        message: {
          message_id: 4,
          chat: { id: 302, type: "private" },
          from: { id: 402 },
          contact: {
            phone_number: "+60123456789",
            first_name: "Alex",
            last_name: "Tan",
            user_id: 502,
            vcard: "BEGIN:VCARD",
          },
        },
      }),
    }),
    "test-secret",
  );

  expect(response.status).toBe(200);
  expect(log).toHaveBeenNthCalledWith(2, "[telegram-webhook] received", {
    updateId: 103,
    eventType: "message",
    chatId: 302,
    chatType: "private",
    senderId: 402,
    messageText: null,
    contact: {
      phoneNumber: "+60123456789",
      firstName: "Alex",
      lastName: "Tan",
      userId: 502,
      hasVcard: true,
    },
  });
});

test("confirms subscription after a private user shares their phone number", async () => {
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  const confirmSubscription = vi.fn().mockResolvedValue(undefined);

  const response = await handleTelegramWebhookRequest(
    new Request("https://example.com/webhook/telegram", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-telegram-bot-api-secret-token": "test-secret",
      },
      body: JSON.stringify({
        update_id: 104,
        message: {
          message_id: 5,
          chat: { id: 303, type: "private" },
          from: { id: 403 },
          contact: { phone_number: "60123456789" },
        },
      }),
    }),
    "test-secret",
    undefined,
    confirmSubscription,
  );

  expect(response.status).toBe(200);
  expect(confirmSubscription).toHaveBeenCalledWith(303);
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
    text: "Please share your phone number for verification so we can subscribe you to notifications.",
    reply_markup: {
      keyboard: [[{ text: "Share phone number", request_contact: true }]],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  });
});

test("sends a notification-ready confirmation through Telegram", async () => {
  const fetchMock = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

  await sendTelegramNotificationReady("test-bot-token", 303);

  const [url, options] = fetchMock.mock.calls[0];
  expect(url).toBe(
    "https://api.telegram.org/bottest-bot-token/sendMessage",
  );
  expect(options?.method).toBe("POST");
  expect(JSON.parse(String(options?.body))).toEqual({
    chat_id: 303,
    text: "Your notifications are ready!",
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
