import { v } from "convex/values";
import {
  httpAction,
  internalMutation,
  type ActionCtx,
  type MutationCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  resolveInboxLedgerContentType,
  resolveWhatsAppAudioFiles,
} from "./chat/inboxAudioIngest";
import { applyOutboundStatusByExternalId } from "./chat/readReceipts";
import { whatsappSyncPool } from "./channelSyncPools";


const messageStatusValidator = v.union(
  v.literal("queued"),
  v.literal("sent"),
  v.literal("delivered"),
  v.literal("read"),
  v.literal("failed"),
);

const contentTypeValidator = v.union(
  v.literal("text"),
  v.literal("image"),
  v.literal("audio"),
  v.literal("file"),
  v.literal("video"),
  v.literal("document"),
  v.literal("unknown"),
);

const stateSyncContactValidator = v.object({
  type: v.optional(v.string()),
  action: v.optional(v.string()),
  contact: v.optional(
    v.object({
      full_name: v.optional(v.string()),
      first_name: v.optional(v.string()),
      phone_number: v.optional(v.string()),
    }),
  ),
  timestampMs: v.optional(v.number()),
});

// GET /webhook/whatsapp — Meta verification handshake. We must echo
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

// POST /webhook/whatsapp — incoming WhatsApp events.
//
// The /webhook/whatsapp dispatcher (convex/http.ts) verifies the X-Hub-Signature
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
      if (change.field === "account_update") {
        const value = change.value;
        const wabaId = value.waba_info?.waba_id ?? entry.id;
        const event = value.event;
        if (!wabaId || !event) continue;
        try {
          const result: AccountUpdateResult = await ctx.runMutation(
            internal.whatsappWebhook.handleAccountUpdate,
            {
              wabaId,
              event,
              phoneNumber: value.phone_number,
              ownerBusinessId: value.waba_info?.owner_business_id,
              partnerAppId: value.waba_info?.partner_app_id,
              timestampMs: parseEntryTimestamp(entry.time),
            },
          );
          if (result.shouldStartSync && result.channelId) {
            await whatsappSyncPool.enqueueAction(
              ctx,
              internal.whatsappSync.initiateCoexistenceSync,
              { channelId: result.channelId },
            );
          }
        } catch (err) {
          console.error("Failed to handle WhatsApp account_update", err);
        }
        continue;
      }

      if (change.field === "smb_app_state_sync") {
        const value = change.value;
        const phoneNumberId = value.metadata?.phone_number_id;
        if (!phoneNumberId) continue;
        try {
          await ctx.runMutation(internal.whatsappWebhook.handleStateSync, {
            phoneNumberId,
            contacts: (value.state_sync ?? []).map((item) => ({
              type: item.type,
              action: item.action,
              contact: item.contact,
              timestampMs: parseOptionalTimestamp(item.metadata?.timestamp),
            })),
          });
        } catch (err) {
          console.error("Failed to handle WhatsApp smb_app_state_sync", err);
        }
        continue;
      }

      if (change.field === "history") {
        const value = change.value;
        const phoneNumberId = value.metadata?.phone_number_id;
        if (!phoneNumberId) continue;

        const historyError = firstHistoryError(value);
        if (historyError) {
          if (historyError.code === 2593109) {
            await ctx.runMutation(internal.whatsappSync.internalMarkHistoryNotShared, {
              phoneNumberId,
              errorCode: historyError.code,
              errorMessage:
                historyError.message ??
                historyError.title ??
                "WhatsApp history sync was not shared by the business.",
            });
          } else {
            console.warn("WhatsApp history webhook contained an error", historyError);
          }
          continue;
        }

        const channel = await ctx.runQuery(
          internal.channels.internalGetChannelByPhoneNumberId,
          { phoneNumberId },
        );
        if (channel === null) continue;

        const metadata = latestHistoryMetadata(value);
        const storageId = await ctx.storage.store(
          new Blob([JSON.stringify(value)], { type: "application/json" }),
        );
        const chunkId: Id<"whatsappHistoryChunks"> = await ctx.runMutation(
          internal.whatsappSync.internalCaptureHistoryChunk,
          {
            channelId: channel._id,
            phoneNumberId,
            phase: metadata.phase,
            chunkOrder: metadata.chunkOrder,
            progress: metadata.progress,
            storageId,
          },
        );
        await whatsappSyncPool.enqueueAction(
          ctx,
          internal.whatsappSync.processHistoryChunk,
          { chunkId },
        );
        continue;
      }

      if (change.field === "smb_message_echoes") {
        const value = change.value;
        const phoneNumberId = value.metadata?.phone_number_id;
        if (!phoneNumberId) continue;
        for (const echo of value.message_echoes ?? []) {
          if (!echo.id || !echo.to) continue;
          try {
            await ctx.runMutation(internal.whatsappWebhook.handleMessageEcho, {
              phoneNumberId,
              to: echo.to,
              externalId: echo.id,
              timestampMs: parseTimestamp(echo.timestamp),
              content: extractContent(echo),
              contentType: resolveWhatsAppContentType(echo),
            });
          } catch (err) {
            console.error("Failed to persist WhatsApp message echo", err);
          }
        }
        continue;
      }

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
              { phoneNumberId, contactAddress: message.from },
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
        console.log("[whatsappWebhook.receive] status event received:", {
          phoneNumberId,
          externalId: status.id,
          status: status.status,
          timestamp: status.timestamp,
          recipientId: status.recipient_id,
        });
        try {
          await ctx.runMutation(internal.whatsappWebhook.handleStatus, {
            phoneNumberId,
            externalId: status.id,
            status: mapStatus(status.status),
            timestampMs: parseOptionalTimestamp(status.timestamp),
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

export const handleAccountUpdate = internalMutation({
  args: {
    wabaId: v.string(),
    event: v.string(),
    phoneNumber: v.optional(v.string()),
    ownerBusinessId: v.optional(v.string()),
    partnerAppId: v.optional(v.string()),
    timestampMs: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<AccountUpdateResult> => {
    await recordAccountUpdate(ctx, args);
    if (isAccountStopEvent(args.event)) {
      await stopWhatsAppConnectionForWaba(ctx, {
        wabaId: args.wabaId,
        event: args.event,
        timestampMs: args.timestampMs,
      });
    }
    return { shouldStartSync: false };
  },
});

function isAccountStopEvent(event: string): boolean {
  return (
    event === "PARTNER_REMOVED" ||
    event === "ACCOUNT_OFFBOARDED" ||
    event === "ACCOUNT_DISABLED" ||
    event === "BUSINESS_ACCOUNT_DISABLED" ||
    event === "ONBOARDING_REJECTED"
  );
}

async function stopWhatsAppConnectionForWaba(
  ctx: MutationCtx,
  args: { wabaId: string; event: string; timestampMs?: number },
) {
  const now = Date.now();
  const message = `WhatsApp account update ${args.event}`;
  const channels = await ctx.db
    .query("channels")
    .withIndex("by_wabaId", (q) => q.eq("wabaId", args.wabaId))
    .take(10);
  for (const channel of channels) {
    await ctx.db.patch(channel._id, {
      status: "error",
      lastError: message,
      historySyncStatus: "failed",
      historySyncError: message,
      historySyncUpdatedAt: args.timestampMs ?? now,
      contactSyncStatus: "failed",
      updatedAt: now,
    });
  }

  const attempts = await ctx.db
    .query("whatsappConnectionAttempts")
    .withIndex("by_wabaId", (q) => q.eq("wabaId", args.wabaId))
    .take(10);
  for (const attempt of attempts) {
    await ctx.db.patch(attempt._id, {
      status: "error",
      lastError: message,
      updatedAt: now,
    });
  }
}

async function recordAccountUpdate(
  ctx: MutationCtx,
  args: {
    wabaId: string;
    event: string;
    phoneNumber?: string;
    ownerBusinessId?: string;
    partnerAppId?: string;
    timestampMs?: number;
  },
) {
  const now = Date.now();
  const existing = await ctx.db
    .query("whatsappAccountUpdates")
    .withIndex("by_wabaId_and_event", (q) =>
      q.eq("wabaId", args.wabaId).eq("event", args.event),
    )
    .unique();
  const patch = {
    phoneNumber: args.phoneNumber,
    ownerBusinessId: args.ownerBusinessId,
    partnerAppId: args.partnerAppId,
    eventAt: args.timestampMs,
    updatedAt: now,
  };
  if (existing === null) {
    await ctx.db.insert("whatsappAccountUpdates", {
      wabaId: args.wabaId,
      event: args.event,
      ...patch,
      createdAt: now,
    });
    return;
  }
  await ctx.db.patch(existing._id, patch);
}

export const handleStateSync = internalMutation({
  args: {
    phoneNumberId: v.string(),
    contacts: v.array(stateSyncContactValidator),
  },
  handler: async (ctx, args) => {
    const channels = await ctx.db
      .query("channels")
      .withIndex("by_phoneNumberId", (q) => q.eq("phoneNumberId", args.phoneNumberId))
      .collect();
    const channel = channels.find((c) => c.status === "connected") ?? channels[0];
    if (channel === undefined) return;

    let lastEventAt: number | undefined;
    for (const item of args.contacts) {
      if (item.type !== "contact") continue;
      if (item.timestampMs !== undefined) {
        lastEventAt =
          lastEventAt === undefined
            ? item.timestampMs
            : Math.max(lastEventAt, item.timestampMs);
      }
      if (item.action !== "add") continue;
      const phone = item.contact?.phone_number?.trim();
      if (!phone) continue;
      const name =
        item.contact?.full_name?.trim() || item.contact?.first_name?.trim();
      await ctx.runMutation(internal.customers.internalUpsertFromWebhook, {
        orgId: channel.orgId,
        service: "whatsapp",
        contactAddress: phone,
        profileName: name || undefined,
        phone,
      });
    }

    const now = Date.now();
    await ctx.db.patch(channel._id, {
      contactSyncStatus: "completed",
      contactSyncLastEventAt: lastEventAt ?? now,
      updatedAt: now,
    });

    const req = await ctx.db
      .query("whatsappSyncRequests")
      .withIndex("by_channelId_and_syncType", (q) =>
        q.eq("channelId", channel._id).eq("syncType", "smb_app_state_sync"),
      )
      .first();
    if (req !== null) {
      await ctx.db.patch(req._id, {
        status: "completed",
        completedAt: now,
        updatedAt: now,
      });
    }
  },
});

export const handleMessageEcho = internalMutation({
  args: {
    phoneNumberId: v.string(),
    to: v.string(),
    externalId: v.string(),
    timestampMs: v.number(),
    content: v.string(),
    contentType: contentTypeValidator,
  },
  handler: async (ctx, args) => {
    const channels = await ctx.db
      .query("channels")
      .withIndex("by_phoneNumberId", (q) => q.eq("phoneNumberId", args.phoneNumberId))
      .collect();
    const channel = channels.find((c) => c.status === "connected") ?? channels[0];
    if (channel === undefined) return;

    await ctx.runMutation(internal.chat.inbox.internalIngestChannelMessage, {
      channelId: channel._id,
      externalId: args.externalId,
      contactAddress: args.to,
      contactPhone: args.to,
      direction: "outgoing",
      content: args.content,
      contentType: args.contentType,
      timestampMs: args.timestampMs,
      isHistorical: false,
      humanAgentName: "WhatsApp Business app",
    });
  },
});

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

    const channels = await ctx.db
      .query("channels")
      .withIndex("by_phoneNumberId", (q) =>
        q.eq("phoneNumberId", args.phoneNumberId),
      )
      .collect();

    let channel = null;
    if (channels.length === 1) {
      channel = channels[0];
    } else if (channels.length > 1) {
      for (const c of channels) {
        const conv = await ctx.db
          .query("conversations")
          .withIndex("by_channel_and_contactAddress", (q) =>
            q.eq("channelId", c._id).eq("contactAddress", args.from),
          )
          .unique();
        if (conv !== null) {
          channel = c;
          break;
        }
      }
      if (channel === null) {
        channel = channels.find((c) => c.status === "connected") ?? channels[0];
      }
    }

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
    phoneNumberId: v.optional(v.string()),
    externalId: v.string(),
    status: messageStatusValidator,
    timestampMs: v.optional(v.number()),
    failureReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db
      .query("messages")
      .withIndex("by_externalId", (q) => q.eq("externalId", args.externalId))
      .first();

    let channel = null;
    if (message !== null && message.channelId !== undefined) {
      channel = await ctx.db.get(message.channelId);
    }

    if (channel === null && args.phoneNumberId !== undefined) {
      const channels = await ctx.db
        .query("channels")
        .withIndex("by_phoneNumberId", (q) =>
          q.eq("phoneNumberId", args.phoneNumberId!),
        )
        .collect();

      if (channels.length === 1) {
        channel = channels[0];
      } else if (channels.length > 1) {
        channel = channels.find((c) => c.status === "connected") ?? channels[0];
      }
    }

    if (args.phoneNumberId !== undefined && channel === null) return;

    await applyOutboundStatusByExternalId(ctx, {
      externalId: args.externalId,
      status: args.status,
      source: "whatsapp_status",
      timestampMs: args.timestampMs,
      channelId: channel?._id,
      failureReason: args.failureReason,
    });
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
    const target = await ctx.db
      .query("messages")
      .withIndex("by_externalId", (q) => q.eq("externalId", args.targetExternalId))
      .first();
    if (target === null) {
      return;
    }

    if (target.channelId === undefined) {
      return;
    }

    const channel = await ctx.db.get(target.channelId);
    if (channel === null || channel.phoneNumberId !== args.phoneNumberId) {
      console.warn(
        `WhatsApp reaction for unknown phone_number_id=${args.phoneNumberId} or mismatched channel; skipping`,
      );
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

function parseOptionalTimestamp(ts?: string): number | undefined {
  if (!ts) return undefined;
  const n = Number(ts);
  if (!Number.isFinite(n)) return undefined;
  return n < 1_000_000_000_000 ? n * 1000 : n;
}

function parseEntryTimestamp(ts?: number | string): number | undefined {
  if (ts === undefined) return undefined;
  const n = Number(ts);
  if (!Number.isFinite(n)) return undefined;
  return n < 1_000_000_000_000 ? n * 1000 : n;
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

function resolveWhatsAppContentType(msg: WhatsAppIncomingMessage) {
  switch (msg.type) {
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
      return resolveInboxLedgerContentType(
        extractContent(msg),
        undefined,
        undefined,
      );
  }
}

function firstHistoryError(
  value: WhatsAppChangeValue,
): WhatsAppHistoryError | undefined {
  for (const item of value.history ?? []) {
    const error = item.errors?.[0];
    if (error) return error;
  }
  return undefined;
}

function latestHistoryMetadata(value: WhatsAppChangeValue): {
  phase?: number;
  chunkOrder?: number;
  progress?: number;
} {
  let latest: { phase?: number; chunkOrder?: number; progress?: number } = {};
  for (const item of value.history ?? []) {
    const metadata = item.metadata;
    if (!metadata) continue;
    if (
      latest.progress === undefined ||
      (metadata.progress ?? 0) >= latest.progress
    ) {
      latest = {
        phase: metadata.phase,
        chunkOrder: metadata.chunk_order,
        progress: metadata.progress,
      };
    }
  }
  return latest;
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
    time?: number | string;
    changes?: Array<{
      field?: string;
      value: WhatsAppChangeValue;
    }>;
  }>;
};

type WhatsAppChangeValue = {
  event?: string;
  phone_number?: string;
  waba_info?: {
    waba_id?: string;
    owner_business_id?: string;
    partner_app_id?: string;
  };
  messaging_product?: string;
  metadata?: { display_phone_number?: string; phone_number_id?: string };
  contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>;
  messages?: WhatsAppIncomingMessage[];
  message_echoes?: WhatsAppIncomingMessage[];
  state_sync?: Array<{
    type?: string;
    action?: string;
    contact?: {
      full_name?: string;
      first_name?: string;
      phone_number?: string;
    };
    metadata?: { timestamp?: string };
  }>;
  history?: Array<{
    metadata?: {
      phase?: number;
      chunk_order?: number;
      progress?: number;
    };
    threads?: Array<{
      id?: string;
      messages?: WhatsAppIncomingMessage[];
    }>;
    errors?: WhatsAppHistoryError[];
  }>;
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
  to?: string;
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

type WhatsAppHistoryError = {
  code?: number;
  title?: string;
  message?: string;
  error_data?: { details?: string };
};

type AccountUpdateResult = {
  shouldStartSync: boolean;
  channelId?: Id<"channels">;
};
