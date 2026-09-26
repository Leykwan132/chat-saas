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

test("username-only contacts persist their provider identity and opted-in username", async () => {
  const runMutation = vi.fn().mockResolvedValue(undefined);
  const ctx = { runMutation } as unknown as Parameters<typeof receive>[0];
  const payload = JSON.stringify({
    entry: [
      {
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: "16505551111",
                phone_number_id: "123456123",
              },
              contacts: [
                {
                  profile: {
                    name: "test user name",
                    username: "@testusername",
                  },
                  user_id: "US.13491208655302741918",
                },
              ],
              messages: [
                {
                  id: "ABGGFlA5Fpa",
                  timestamp: "1504902988",
                  from_user_id: "US.13491208655302741918",
                  type: "text",
                  text: { body: "this is a text message" },
                },
              ],
            },
          },
        ],
      },
    ],
  });

  const response = await receive(ctx, payload);
  const inboundArgs = runMutation.mock.calls
    .map((call) => call[1])
    .find(
      (args) =>
        args !== null &&
        typeof args === "object" &&
        "externalId" in args &&
        args.externalId === "ABGGFlA5Fpa",
    );

  expect(response.status).toBe(200);
  expect(inboundArgs).toMatchObject({
    from: "US.13491208655302741918",
    profileName: "test user name",
    whatsappUserId: "US.13491208655302741918",
    whatsappUsername: "@testusername",
  });
});

test("live WhatsApp messages use the numeric address while retaining the Meta user ID", async () => {
  const runMutation = vi.fn().mockResolvedValue(undefined);
  const ctx = { runMutation } as unknown as Parameters<typeof receive>[0];
  const response = await receive(ctx, JSON.stringify({
    entry: [{
      changes: [{
        field: "messages",
        value: {
          metadata: { phone_number_id: "phone-123" },
          contacts: [{
            wa_id: "60129499394",
            user_id: "MY.1681538786237414",
            profile: { name: "Kwan" },
          }],
          messages: [{
            id: "message-identity-123",
            from: "60129499394",
            from_user_id: "MY.1681538786237414",
            timestamp: "1700000000",
            type: "text",
            text: { body: "Hello" },
          }],
        },
      }],
    }],
  }));
  const inboundArgs = runMutation.mock.calls
    .map((call) => call[1])
    .find(
      (args) =>
        args !== null &&
        typeof args === "object" &&
        "externalId" in args &&
        args.externalId === "message-identity-123",
    );

  expect(response.status).toBe(200);
  expect(inboundArgs).toMatchObject({
    from: "60129499394",
    whatsappUserId: "MY.1681538786237414",
  });
});

test("WhatsApp edits update the original message without creating a new inbound message", async () => {
  const runMutation = vi.fn().mockResolvedValue(undefined);
  const ctx = { runMutation } as unknown as Parameters<typeof receive>[0];
  const response = await receive(ctx, JSON.stringify({
    entry: [{
      changes: [{
        field: "messages",
        value: {
          metadata: { phone_number_id: "phone-123" },
          messages: [{
            id: "edit-event-123",
            from: "60129499394",
            timestamp: "1700000005",
            type: "edit",
            edit: {
              original_message_id: "original-message-123",
              message: { type: "text", text: { body: "Updated message" } },
            },
          }],
        },
      }],
    }],
  }));

  const editArgs = runMutation.mock.calls
    .map((call) => call[1])
    .find(
      (args) =>
        args !== null &&
        typeof args === "object" &&
        "originalExternalId" in args,
    );
  const inboundArgs = runMutation.mock.calls
    .map((call) => call[1])
    .find(
      (args) =>
        args !== null &&
        typeof args === "object" &&
        "externalId" in args &&
        args.externalId === "edit-event-123",
    );

  expect(response.status).toBe(200);
  expect(editArgs).toMatchObject({
    phoneNumberId: "phone-123",
    originalExternalId: "original-message-123",
    eventExternalId: "edit-event-123",
    content: "Updated message",
  });
  expect(inboundArgs).toBeUndefined();
});

test("WhatsApp revokes update the original message without creating a new inbound message", async () => {
  const runMutation = vi.fn().mockResolvedValue(undefined);
  const ctx = { runMutation } as unknown as Parameters<typeof receive>[0];
  const response = await receive(ctx, JSON.stringify({
    entry: [{
      changes: [{
        field: "messages",
        value: {
          metadata: { phone_number_id: "phone-123" },
          messages: [{
            id: "revoke-event-123",
            from: "60129499394",
            timestamp: "1700000005",
            type: "revoke",
            revoke: { original_message_id: "original-message-123" },
          }],
        },
      }],
    }],
  }));

  const revokeArgs = runMutation.mock.calls
    .map((call) => call[1])
    .find(
      (args) =>
        args !== null &&
        typeof args === "object" &&
        "originalExternalId" in args,
    );
  const inboundArgs = runMutation.mock.calls
    .map((call) => call[1])
    .find(
      (args) =>
        args !== null &&
        typeof args === "object" &&
        "externalId" in args &&
        args.externalId === "revoke-event-123",
    );

  expect(response.status).toBe(200);
  expect(revokeArgs).toMatchObject({
    phoneNumberId: "phone-123",
    originalExternalId: "original-message-123",
  });
  expect(inboundArgs).toBeUndefined();
});

test("user ID change system events update identity without ingesting a chat message", async () => {
  const runMutation = vi.fn().mockResolvedValue(undefined);
  const ctx = { runMutation } as unknown as Parameters<typeof receive>[0];
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
                  id: "system-message-123",
                  timestamp: "1700000000",
                  type: "system",
                  system: {
                    type: "user_changed_user_id",
                    user_id: "US.new",
                    previous_user_id: "US.old",
                  },
                },
              ],
            },
          },
        ],
      },
    ],
  });

  const response = await receive(ctx, payload);
  const systemChangeArgs = runMutation.mock.calls
    .map((call) => call[1])
    .find(
      (args) =>
        args !== null &&
        typeof args === "object" &&
        "previousUserId" in args &&
        args.previousUserId === "US.old",
    );
  const inboundArgs = runMutation.mock.calls
    .map((call) => call[1])
    .find(
      (args) =>
        args !== null &&
        typeof args === "object" &&
        "externalId" in args &&
        args.externalId === "system-message-123",
    );

  expect(response.status).toBe(200);
  expect(systemChangeArgs).toMatchObject({
    phoneNumberId: "phone-123",
    previousUserId: "US.old",
    userId: "US.new",
  });
  expect(inboundArgs).toBeUndefined();
});

test("number-change system events forward the current phone without ingesting a chat message", async () => {
  const runMutation = vi.fn().mockResolvedValue(undefined);
  const ctx = { runMutation } as unknown as Parameters<typeof receive>[0];
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
                  id: "system-message-456",
                  timestamp: "1700000000",
                  type: "system",
                  system: {
                    type: "user_changed_number",
                    wa_id: "16505551111",
                    user_id: "US.new",
                    previous_user_id: "US.old",
                    parent_user_id: "PARENT.new",
                    previous_parent_user_id: "PARENT.old",
                  },
                },
              ],
            },
          },
        ],
      },
    ],
  });

  const response = await receive(ctx, payload);
  const systemChangeArgs = runMutation.mock.calls
    .map((call) => call[1])
    .find(
      (args) =>
        args !== null &&
        typeof args === "object" &&
        "previousUserId" in args &&
        args.previousUserId === "US.old",
    );
  const inboundArgs = runMutation.mock.calls
    .map((call) => call[1])
    .find(
      (args) =>
        args !== null &&
        typeof args === "object" &&
        "externalId" in args &&
        args.externalId === "system-message-456",
    );

  expect(response.status).toBe(200);
  expect(systemChangeArgs).toMatchObject({
    phoneNumberId: "phone-123",
    previousUserId: "US.old",
    userId: "US.new",
    phone: "16505551111",
  });
  expect(inboundArgs).toBeUndefined();
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

test("forwards complete Meta status pricing and ignores incomplete pricing", async () => {
  const runMutation = vi.fn().mockResolvedValue(undefined);
  const ctx = { runMutation } as unknown as Parameters<typeof receive>[0];
  const payload = JSON.stringify({
    entry: [
      {
        changes: [
          {
            field: "messages",
            value: {
              metadata: { phone_number_id: "phone-123" },
              statuses: [
                {
                  id: "wamid.complete-pricing",
                  status: "sent",
                  timestamp: "1790438560",
                  pricing: {
                    billable: false,
                    pricing_model: "PMP",
                    type: "free_customer_service",
                    category: "service",
                  },
                },
                {
                  id: "wamid.incomplete-pricing",
                  status: "sent",
                  timestamp: "1790438561",
                  pricing: {
                    billable: true,
                    pricing_model: "PMP",
                    type: "regular",
                  },
                },
              ],
            },
          },
        ],
      },
    ],
  });

  const response = await receive(ctx, payload);
  const statusArgs = runMutation.mock.calls.map((call) => call[1]);

  expect(response.status).toBe(200);
  expect(statusArgs).toContainEqual({
    phoneNumberId: "phone-123",
    externalId: "wamid.complete-pricing",
    status: "sent",
    timestampMs: 1_790_438_560_000,
    failureReason: undefined,
    pricing: {
      billable: false,
      pricingModel: "PMP",
      type: "free_customer_service",
      category: "service",
    },
  });
  expect(statusArgs).toContainEqual({
    phoneNumberId: "phone-123",
    externalId: "wamid.incomplete-pricing",
    status: "sent",
    timestampMs: 1_790_438_561_000,
    failureReason: undefined,
  });
});
