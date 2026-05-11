import { v } from "convex/values";
import {
  httpAction,
  internalMutation,
  type MutationCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const contentTypeValidator = v.union(
  v.literal("text"),
  v.literal("image"),
  v.literal("audio"),
  v.literal("video"),
  v.literal("document"),
  v.literal("unknown"),
);

const messageStatusValidator = v.union(
  v.literal("queued"),
  v.literal("sent"),
  v.literal("delivered"),
  v.literal("read"),
  v.literal("failed"),
);

// GET /webhook/meta — Meta verification handshake. We must echo
// `hub.challenge` plain when `hub.verify_token` matches the secret we
// configured in the Meta App Dashboard webhook settings.
export const verify = httpAction(async (_ctx, req) => {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  const expected = process.env.META_APP_VERIFY_TOKEN;
  if (!expected) {
    console.error("META_APP_VERIFY_TOKEN is not configured");
    return new Response("server misconfigured", { status: 500 });
  }
  if (mode === "subscribe" && token === expected && challenge !== null) {
    return new Response(challenge, { status: 200 });
  }
  return new Response("forbidden", { status: 403 });
});

// POST /webhook/meta — incoming events.
//
// We:
//   1. Read the raw body (signature is computed over the exact bytes Meta
//      sent, so we can't use req.json() before validating).
//   2. Verify the X-Hub-Signature-256 HMAC against META_APP_SECRET.
//   3. Walk entry[].changes[].value and dispatch each message / status into
//      an internal mutation that writes to the DB atomically.
//   4. Always reply 200 once the signature is valid — Meta otherwise retries
//      and we'd dedupe via externalId, but this keeps the dashboard clean.
export const receive = httpAction(async (ctx, req) => {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) {
    console.error("META_APP_SECRET is not configured");
    return new Response("server misconfigured", { status: 500 });
  }

  const sigHeader = req.headers.get("x-hub-signature-256");
  if (!sigHeader || !sigHeader.startsWith("sha256=")) {
    return new Response("missing signature", { status: 400 });
  }
  const providedHex = sigHeader.slice("sha256=".length);

  const rawBody = await req.text();
  const valid = await verifyHmac(appSecret, rawBody, providedHex);
  if (!valid) {
    return new Response("invalid signature", { status: 401 });
  }

  let payload: WhatsAppWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WhatsAppWebhookPayload;
  } catch {
    return new Response("invalid json", { status: 400 });
  }

  if (payload.object !== "whatsapp_business_account") {
    // We only register for the WhatsApp product today; ignore others.
    return new Response(null, { status: 200 });
  }

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages") continue;
      const value = change.value;
      const phoneNumberId = value.metadata?.phone_number_id;
      if (!phoneNumberId) continue;

      // Profile name lives on contacts[], wa_id is the join key.
      const nameByWaId = new Map<string, string>();
      for (const c of value.contacts ?? []) {
        if (c.wa_id && c.profile?.name) {
          nameByWaId.set(c.wa_id, c.profile.name);
        }
      }

      for (const message of value.messages ?? []) {
        try {
          await ctx.runMutation(internal.whatsappWebhook.handleIncoming, {
            phoneNumberId,
            externalId: message.id,
            from: message.from,
            timestampMs: parseTimestamp(message.timestamp),
            contentType: mapContentType(message.type),
            content: extractContent(message),
            profileName: nameByWaId.get(message.from),
          });
        } catch (err) {
          console.error("Failed to persist incoming WhatsApp message", err);
        }
      }

      for (const status of value.statuses ?? []) {
        try {
          await ctx.runMutation(internal.whatsappWebhook.handleStatus, {
            externalId: status.id,
            status: mapStatus(status.status),
            failureReason: status.errors?.[0]?.title,
          });
        } catch (err) {
          console.error("Failed to apply WhatsApp status update", err);
        }
      }
    }
  }

  return new Response(null, { status: 200 });
});

// Persist one inbound message + upsert its conversation + customer. Wrapped
// in a single internal mutation so all three writes happen atomically.
export const handleIncoming = internalMutation({
  args: {
    phoneNumberId: v.string(),
    externalId: v.string(),
    from: v.string(),
    timestampMs: v.number(),
    contentType: contentTypeValidator,
    content: v.string(),
    profileName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Dedupe — if Meta retries the same delivery we'll have already saved it.
    const existingMsg = await ctx.db
      .query("messages")
      .withIndex("by_externalId", (q) => q.eq("externalId", args.externalId))
      .unique();
    if (existingMsg !== null) return;

    const channel = await ctx.db
      .query("channels")
      .withIndex("by_phoneNumberId", (q) =>
        q.eq("phoneNumberId", args.phoneNumberId),
      )
      .unique();
    if (channel === null) {
      console.warn(
        `Webhook for unknown phone_number_id=${args.phoneNumberId}; skipping`,
      );
      return;
    }

    const customerId: Id<"customers"> = await ctx.runMutation(
      internal.customers.internalUpsertFromWebhook,
      {
        orgId: channel.orgId,
        service: "whatsapp",
        contactAddress: args.from,
        profileName: args.profileName,
      },
    );

    const conversationId = await upsertConversation(ctx, {
      orgId: channel.orgId,
      channelId: channel._id,
      orgAddress: channel.phoneNumberId ?? args.phoneNumberId,
      contactAddress: args.from,
      contactName: args.profileName,
      customerId,
      lastMessageAt: args.timestampMs,
      preview: previewFor(args.contentType, args.content),
    });

    await ctx.db.insert("messages", {
      orgId: channel.orgId,
      conversationId,
      channelId: channel._id,
      service: "whatsapp",
      externalId: args.externalId,
      orgAddress: channel.phoneNumberId ?? args.phoneNumberId,
      contactAddress: args.from,
      direction: "incoming",
      contentType: args.contentType,
      content: args.content,
      createdAt: args.timestampMs,
    });

    // Patch lastConversationId on the customer so the Customers page can
    // jump straight into the most recent thread.
    await ctx.runMutation(internal.customers.internalSetLastConversation, {
      customerId,
      conversationId,
    });
  },
});

// Apply a sent/delivered/read/failed status update to an existing outgoing
// message. No-op if we don't have the original (e.g. it was sent from a
// different platform).
export const handleStatus = internalMutation({
  args: {
    externalId: v.string(),
    status: messageStatusValidator,
    failureReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const msg = await ctx.db
      .query("messages")
      .withIndex("by_externalId", (q) => q.eq("externalId", args.externalId))
      .unique();
    if (msg === null) return;
    const patch: Record<string, unknown> = { status: args.status };
    if (args.failureReason) patch.failureReason = args.failureReason;
    await ctx.db.patch(msg._id, patch);
  },
});

async function upsertConversation(
  ctx: MutationCtx,
  args: {
    orgId: string;
    channelId: Id<"channels">;
    orgAddress: string;
    contactAddress: string;
    contactName?: string;
    customerId: Id<"customers">;
    lastMessageAt: number;
    preview: string;
  },
): Promise<Id<"conversations">> {
  const existing = await ctx.db
    .query("conversations")
    .withIndex("by_channel_and_contactAddress", (q) =>
      q.eq("channelId", args.channelId).eq("contactAddress", args.contactAddress),
    )
    .unique();

  const now = Date.now();
  if (existing === null) {
    return await ctx.db.insert("conversations", {
      orgId: args.orgId,
      channelId: args.channelId,
      service: "whatsapp",
      orgAddress: args.orgAddress,
      contactAddress: args.contactAddress,
      contactName: args.contactName,
      customerId: args.customerId,
      status: "open",
      lastMessageAt: args.lastMessageAt,
      lastMessagePreview: args.preview,
      unreadCount: 1,
      createdAt: now,
      updatedAt: now,
    });
  }

  const patch: Record<string, unknown> = {
    lastMessageAt: args.lastMessageAt,
    lastMessagePreview: args.preview,
    unreadCount: existing.unreadCount + 1,
    updatedAt: now,
  };
  if (!existing.contactName && args.contactName) {
    patch.contactName = args.contactName;
  }
  if (!existing.customerId) {
    patch.customerId = args.customerId;
  }
  if (existing.status === "closed") patch.status = "open";
  await ctx.db.patch(existing._id, patch);
  return existing._id;
}

// --- Helpers ---

function parseTimestamp(ts?: string): number {
  if (!ts) return Date.now();
  const n = Number(ts);
  if (!Number.isFinite(n)) return Date.now();
  return n * 1000;
}

function mapContentType(type?: string) {
  switch (type) {
    case "text":
      return "text" as const;
    case "image":
      return "image" as const;
    case "audio":
      return "audio" as const;
    case "video":
      return "video" as const;
    case "document":
      return "document" as const;
    default:
      return "unknown" as const;
  }
}

function extractContent(msg: WhatsAppIncomingMessage): string {
  if (msg.text?.body) return msg.text.body;
  if (msg.image?.caption) return msg.image.caption;
  if (msg.video?.caption) return msg.video.caption;
  if (msg.document?.caption) return msg.document.caption;
  if (msg.button?.text) return msg.button.text;
  if (msg.interactive?.button_reply?.title)
    return msg.interactive.button_reply.title;
  if (msg.interactive?.list_reply?.title)
    return msg.interactive.list_reply.title;
  return `<${msg.type ?? "unknown"}>`;
}

function previewFor(
  contentType: "text" | "image" | "audio" | "video" | "document" | "unknown",
  content: string,
): string {
  if (contentType === "text") return content.slice(0, 140);
  return `[${contentType}] ${content.slice(0, 140)}`;
}

function mapStatus(status?: string) {
  switch (status) {
    case "sent":
      return "sent" as const;
    case "delivered":
      return "delivered" as const;
    case "read":
      return "read" as const;
    case "failed":
      return "failed" as const;
    default:
      return "queued" as const;
  }
}

async function verifyHmac(secret: string, body: string, providedHex: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  const expectedHex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return timingSafeEqualHex(expectedHex, providedHex.toLowerCase());
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// --- Inbound payload types (subset of Meta docs we actually use) ---

type WhatsAppWebhookPayload = {
  object?: string;
  entry?: Array<{
    id?: string;
    changes?: Array<{
      field?: string;
      value: WhatsAppChangeValue;
    }>;
  }>;
};

type WhatsAppChangeValue = {
  messaging_product?: string;
  metadata?: { display_phone_number?: string; phone_number_id?: string };
  contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>;
  messages?: WhatsAppIncomingMessage[];
  statuses?: Array<{
    id: string;
    status: string;
    timestamp?: string;
    recipient_id?: string;
    errors?: Array<{ code?: number; title?: string; message?: string }>;
  }>;
};

type WhatsAppIncomingMessage = {
  id: string;
  from: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
  image?: { caption?: string; id?: string };
  video?: { caption?: string; id?: string };
  audio?: { id?: string };
  document?: { caption?: string; id?: string; filename?: string };
  button?: { text?: string };
  interactive?: {
    button_reply?: { id?: string; title?: string };
    list_reply?: { id?: string; title?: string };
  };
};
