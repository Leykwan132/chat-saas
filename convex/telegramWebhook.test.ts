import { afterEach, expect, test, vi } from "vitest";
import { handleTelegramWebhookRequest } from "./telegramWebhook";

afterEach(() => {
  vi.restoreAllMocks();
});

test("logs safe metadata for an authenticated message update", async () => {
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
          chat: { id: 300 },
          from: { id: 400 },
        },
      }),
    }),
    "test-secret",
  );

  expect(response.status).toBe(200);
  expect(log).toHaveBeenCalledOnce();
  expect(log).toHaveBeenCalledWith("[telegram-webhook] received", {
    updateId: 101,
    eventType: "message",
    chatId: 300,
    senderId: 400,
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
