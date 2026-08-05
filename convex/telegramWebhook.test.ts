import { afterEach, expect, test, vi } from "vitest";
import { handleTelegramWebhookRequest } from "./telegramWebhook";
import { parseTelegramUpdate } from "./telegramNotifications/updateParser";

afterEach(() => {
  vi.restoreAllMocks();
});

test("parses private Telegram messages with string identifiers", () => {
  expect(parseTelegramUpdate({
    update_id: 101,
    message: {
      text: "/start abc_def-123",
      chat: { id: 300, type: "private" },
      from: { id: 400 },
    },
  })).toMatchObject({
    updateId: 101,
    chatId: "300",
    senderId: "400",
    text: "/start abc_def-123",
  });
});

test("binds a valid start token and requests a self-contact without logging it", async () => {
  const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
  const bindVerificationChat = vi.fn().mockResolvedValue(true);
  const sendMessage = vi.fn().mockResolvedValue(undefined);
  const response = await handleTelegramWebhookRequest(
    new Request("https://example.com/webhook/telegram", {
      method: "POST",
      headers: { "x-telegram-bot-api-secret-token": "test-secret" },
      body: JSON.stringify({
        update_id: 102,
        message: {
          text: "/start abc_def-123",
          chat: { id: 301, type: "private" },
          from: { id: 401 },
        },
      }),
    }),
    "test-secret",
    {
      bindVerificationChat,
      verifySharedContact: vi.fn(),
      sendMessage,
    },
  );

  expect(response.status).toBe(200);
  expect(bindVerificationChat).toHaveBeenCalledWith(expect.stringMatching(/^[A-Za-z0-9_-]{43}$/), "301");
  expect(sendMessage).toHaveBeenCalledWith(
    "301",
    "To subscribe to notifications, please share the phone number you want to verify.",
    expect.any(Object),
  );
  expect(JSON.stringify(log.mock.calls)).not.toContain("abc_def-123");
});

test("confirms only a verified contact share", async () => {
  const sendMessage = vi.fn().mockResolvedValue(undefined);
  const verifySharedContact = vi.fn().mockResolvedValue(true);
  const response = await handleTelegramWebhookRequest(
    new Request("https://example.com/webhook/telegram", {
      method: "POST",
      headers: { "x-telegram-bot-api-secret-token": "test-secret" },
      body: JSON.stringify({
        update_id: 103,
        message: {
          chat: { id: 302, type: "private" },
          from: { id: 402 },
          contact: { phone_number: "+60123456789", user_id: 402, first_name: "Alex" },
        },
      }),
    }),
    "test-secret",
    { bindVerificationChat: vi.fn(), verifySharedContact, sendMessage },
  );

  expect(response.status).toBe(200);
  expect(verifySharedContact).toHaveBeenCalledWith({
    chatId: "302",
    senderId: "402",
    contactUserId: "402",
    phoneNumber: "+60123456789",
    firstName: "Alex",
    lastName: undefined,
  });
  expect(sendMessage).toHaveBeenCalledWith("302", "Your notifications are ready!");
});

test("rejects requests with an invalid secret or malformed JSON", async () => {
  const operations = {
    bindVerificationChat: vi.fn(),
    verifySharedContact: vi.fn(),
    sendMessage: vi.fn(),
  };
  const unauthorized = await handleTelegramWebhookRequest(
    new Request("https://example.com/webhook/telegram", { method: "POST" }),
    "test-secret",
    operations,
  );
  const malformed = await handleTelegramWebhookRequest(
    new Request("https://example.com/webhook/telegram", {
      method: "POST",
      headers: { "x-telegram-bot-api-secret-token": "test-secret" },
      body: "{",
    }),
    "test-secret",
    operations,
  );
  expect(unauthorized.status).toBe(401);
  expect(malformed.status).toBe(400);
});
