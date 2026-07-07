import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { Doc } from "../_generated/dataModel";
import { sendMediaToChannel } from "./channelSend";

function whatsappConversation() {
  return {
    service: "whatsapp",
    contactAddress: "60123456789",
  } as unknown as Doc<"conversations">;
}

function whatsappChannel() {
  return {
    status: "connected",
    phoneNumberId: "1234567890",
    accessToken: "test-token",
  } as unknown as Doc<"channels">;
}

function messengerConversation() {
  return {
    service: "messenger",
    contactAddress: "recipient-id",
    lastCustomerMessageAt: Date.now(),
  } as unknown as Doc<"conversations">;
}

function messengerChannel() {
  return {
    status: "connected",
    pageId: "page-id",
    accessToken: "page-token",
  } as unknown as Doc<"channels">;
}

function parseBody(init: RequestInit | undefined) {
  return JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
}

beforeEach(() => {
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test("sends multiple WhatsApp photo/video URLs before the text response", async () => {
  const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(url), body: parseBody(init) });
      return new Response(JSON.stringify({ messages: [{ id: `wamid.${calls.length}` }] }), {
        status: 200,
      });
    }),
  );

  const result = await sendMediaToChannel(whatsappConversation(), whatsappChannel(), {
    mediaItems: [
      {
        url: "https://cdn.example.com/first.jpg",
        mediaType: "image/jpeg",
        filename: "first.jpg",
      },
      {
        url: " https://cdn.example.com/second.mp4 ",
        mediaType: "video/mp4",
        filename: "second.mp4",
      },
    ],
    text: "Here you go.",
  });

  expect(result).toEqual({
    ok: true,
    externalId: "wamid.3",
    externalIds: ["wamid.1", "wamid.2"],
  });
  expect(calls).toHaveLength(3);
  expect(calls.map((call) => call.url)).toEqual([
    "https://graph.facebook.com/v22.0/1234567890/messages",
    "https://graph.facebook.com/v22.0/1234567890/messages",
    "https://graph.facebook.com/v22.0/1234567890/messages",
  ]);
  expect(calls[0]!.body).toMatchObject({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: "60123456789",
    type: "image",
    image: { link: "https://cdn.example.com/first.jpg" },
  });
  expect(calls[1]!.body).toMatchObject({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: "60123456789",
    type: "video",
    video: { link: "https://cdn.example.com/second.mp4" },
  });
  expect(calls[2]!.body).toMatchObject({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: "60123456789",
    type: "text",
    text: { body: "Here you go." },
  });
});

test("does not send WhatsApp text when image delivery fails first", async () => {
  const calls: Array<Record<string, unknown>> = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      calls.push(parseBody(init));
      return new Response(JSON.stringify({ error: { message: "Bad image", code: 190 } }), {
        status: 400,
      });
    }),
  );

  const result = await sendMediaToChannel(whatsappConversation(), whatsappChannel(), {
    imageUrls: ["https://cdn.example.com/broken.jpg"],
    text: "Here you go.",
  });

  expect(result).toEqual({
    ok: false,
    error: "Bad image",
    errorCode: 190,
    policy: "generic",
  });
  expect(calls).toHaveLength(1);
  expect(calls[0]!.type).toBe("image");
  expect(console.error).toHaveBeenCalledWith(
    "[mediaSend] graph_error",
    expect.objectContaining({
      service: "whatsapp",
      route: "whatsapp.image",
      httpStatus: 400,
      error: "Bad image",
      errorCode: 190,
    }),
  );
});

test("sends Messenger media payload arrays before the text response", async () => {
  const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(url), body: parseBody(init) });
      return new Response(JSON.stringify({ message_id: `mid.${calls.length}` }), {
        status: 200,
      });
    }),
  );

  const result = await sendMediaToChannel(messengerConversation(), messengerChannel(), {
    mediaItems: [
      { url: "https://cdn.example.com/first.jpg", mediaType: "image/jpeg" },
      { url: "https://cdn.example.com/second.pdf", mediaType: "application/pdf" },
    ],
    text: "Done.",
  });

  expect(result).toEqual({
    ok: true,
    externalId: "mid.2",
    externalIds: ["mid.1"],
  });
  expect(calls).toHaveLength(2);
  expect(calls.map((call) => call.url)).toEqual([
    "https://graph.facebook.com/v22.0/me/messages",
    "https://graph.facebook.com/v22.0/me/messages",
  ]);
  expect(calls[0]!.body).toMatchObject({
    messaging_type: "RESPONSE",
    recipient: { id: "recipient-id" },
    message: {
      attachments: [
        {
          type: "image",
          payload: { url: "https://cdn.example.com/first.jpg" },
        },
        {
          type: "file",
          payload: { url: "https://cdn.example.com/second.pdf" },
        },
      ],
    },
  });
  expect(calls[0]!.body.message).not.toHaveProperty("attachment");
  expect(calls[1]!.body).toMatchObject({
    messaging_type: "RESPONSE",
    recipient: { id: "recipient-id" },
    message: { text: "Done." },
  });
});

test("sends a single Messenger asset with the attachments array payload", async () => {
  const calls: Array<{ body: Record<string, unknown> }> = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ body: parseBody(init) });
      return new Response(JSON.stringify({ message_id: "mid.1" }), {
        status: 200,
      });
    }),
  );

  const result = await sendMediaToChannel(messengerConversation(), messengerChannel(), {
    mediaItems: [{ url: "https://cdn.example.com/demo.mp4", mediaType: "video/mp4" }],
  });

  expect(result).toEqual({
    ok: true,
    externalId: "mid.1",
    externalIds: ["mid.1"],
  });
  expect(calls).toHaveLength(1);
  expect(calls[0]!.body).toMatchObject({
    messaging_type: "RESPONSE",
    recipient: { id: "recipient-id" },
    message: {
      attachments: [
        {
          type: "video",
          payload: { url: "https://cdn.example.com/demo.mp4" },
        },
      ],
    },
  });
  expect(calls[0]!.body.message).not.toHaveProperty("attachment");
});
