import { v } from "convex/values";
import { httpAction, internalMutation, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  resolveInboxLedgerContentType,
  resolveWhatsAppAudioFiles,
} from "./chat/inboxAudioIngest";

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

// POST /webhook/meta — incoming WhatsApp events.
//
// The /webhook/meta dispatcher (convex/http.ts) verifies the X-Hub-Signature
// HMAC and reads the raw body before calling this handler, so we just walk
// entry[].changes[].value and persist each message / status update.
//
// Exposed as a plain async function (not an httpAction) so the dispatcher
// can invoke it directly with the already-decoded body.
export async function receive(
  ctx: ActionCtx,
  rawBody: string,
): Promise<Response> {
  let payload: WhatsAppWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WhatsAppWebhookPayload;
  } catch {
    return new Response("invalid json", { status: 400 });
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
          if (message.type === "reaction" && message.reaction?.message_id) {
            await ctx.runMutation(internal.whatsappWebhook.handleReaction, {
              phoneNumberId,
              from: message.from,
              profileName: nameByWaId.get(message.from),
              targetExternalId: message.reaction.message_id,
              emoji: message.reaction.emoji,
            });
            continue;
          }

          let files:
            | Array<{ url: string; mimeType: string }>
            | undefined;
          if (message.type === "audio" && message.audio?.id) {
            const channel = await ctx.runQuery(
              internal.channels.internalGetChannelByPhoneNumberId,
              { phoneNumberId },
            );
            if (channel?.accessToken) {
              try {
                files = await resolveWhatsAppAudioFiles(
                  message.audio.id,
                  channel.accessToken,
                );
              } catch (err) {
                console.error("Failed to fetch WhatsApp audio media", err);
              }
            }
          }

          await ctx.runMutation(internal.whatsappWebhook.handleIncoming, {
            phoneNumberId,
            externalId: message.id,
            from: message.from,
            timestampMs: parseTimestamp(message.timestamp),
            content: extractContent(message),
            profileName: nameByWaId.get(message.from),
            files,
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
}

// Persist one inbound message + upsert its conversation + customer. Wrapped
// in a single internal mutation so all three writes happen atomically.
export const handleIncoming = internalMutation({
  args: {
    phoneNumberId: v.string(),
    externalId: v.string(),
    from: v.string(),
    timestampMs: v.number(),
    content: v.string(),
    profileName: v.optional(v.string()),
    files: v.optional(
      v.array(
        v.object({
          url: v.string(),
          mimeType: v.string(),
        }),
      ),
    ),
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

    const contentType = resolveInboxLedgerContentType(
      args.content,
      undefined,
      args.files,
    );

    await ctx.runMutation(internal.chat.inbox.internalIngestChannelMessage, {
      channelId: channel._id,
      externalId: args.externalId,
      contactAddress: args.from,
      contactName: args.profileName,
      direction: "incoming",
      content: args.content,
      contentType,
      timestampMs: args.timestampMs,
      isHistorical: false,
      files: args.files,
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

export const handleReaction = internalMutation({
  args: {
    phoneNumberId: v.string(),
    from: v.string(),
    profileName: v.optional(v.string()),
    targetExternalId: v.string(),
    emoji: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const channel = await ctx.db
      .query("channels")
      .withIndex("by_phoneNumberId", (q) =>
        q.eq("phoneNumberId", args.phoneNumberId),
      )
      .unique();
    if (channel === null) {
      console.warn(
        `WhatsApp reaction for unknown phone_number_id=${args.phoneNumberId}; skipping`,
      );
      return;
    }
    const target = await ctx.db
      .query("messages")
      .withIndex("by_externalId", (q) => q.eq("externalId", args.targetExternalId))
      .unique();
    if (target === null || target.channelId !== channel._id) {
      return;
    }

    if (args.emoji === undefined || args.emoji.trim() === "") {
      await ctx.runMutation(internal.chat.reactions.internalRemoveReaction, {
        conversationId: target.conversationId,
        messageId: target._id,
        source: "customer",
        fallbackActorKey: args.from,
      });
      return;
    }

    await ctx.runMutation(internal.chat.reactions.internalUpsertReaction, {
      conversationId: target.conversationId,
      messageId: target._id,
      emoji: args.emoji,
      source: "customer",
      actorName: args.profileName ?? args.from,
    });
  },
});

// --- Helpers ---

function parseTimestamp(ts?: string): number {
  if (!ts) return Date.now();
  const n = Number(ts);
  if (!Number.isFinite(n)) return Date.now();
  return n * 1000;
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
  if (msg.type === "audio") return "";
  return `<${msg.type ?? "unknown"}>`;
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
  reaction?: { message_id?: string; emoji?: string };
  button?: { text?: string };
  interactive?: {
    button_reply?: { id?: string; title?: string };
    list_reply?: { id?: string; title?: string };
  };
};
