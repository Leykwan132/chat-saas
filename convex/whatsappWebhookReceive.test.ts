/// <reference types="vite/client" />
import { afterEach, expect, test, vi } from "vitest";
import { receive } from "./whatsappWebhook";

function incomingPayload() {
  return JSON.stringify({
    entry: [
      {
        changes: [
          {
            field: "messages",
            value: {
              metadata: {
                phone_number_id: "phone-123",
              },
              messages: [
                {
                  id: "message-123",
                  from: "60123456789",
                  timestamp: "1700000000",
                  type: "text",
                  text: {
                    body: "Hello",
                  },
                },
              ],
            },
          },
        ],
      },
    ],
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

test("incoming persistence failure returns a retryable HTTP status", async () => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  const ctx = {
    runMutation: vi.fn().mockRejectedValue(new Error("persistence failed")),
  } as unknown as Parameters<typeof receive>[0];

  const response = await receive(ctx, incomingPayload());

  expect(response.status).toBe(500);
});

test("successful incoming persistence returns HTTP 200", async () => {
  const ctx = {
    runMutation: vi.fn().mockResolvedValue(undefined),
  } as unknown as Parameters<typeof receive>[0];

  const response = await receive(ctx, incomingPayload());

  expect(response.status).toBe(200);
});

test("unsupported Meta messages are logged but not ingested", async () => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  const runMutation = vi.fn();
  const ctx = {
    runMutation,
  } as unknown as Parameters<typeof receive>[0];
  const payload = JSON.stringify({
    entry: [
      {
        changes: [
          {
            field: "messages",
            value: {
              metadata: { phone_number_id: "phone-123" },
              messages: [
                {
                  id: "message-unsupported",
                  from: "60123456789",
                  timestamp: "1700000000",
                  type: "unsupported",
                  errors: [
                    {
                      code: 131051,
                      title: "Message type unknown",
                      message: "Message type unknown",
                    },
                  ],
                },
              ],
            },
          },
        ],
      },
    ],
  });

  const response = await receive(ctx, payload);

  expect(response.status).toBe(200);
  expect(runMutation).not.toHaveBeenCalled();
});

