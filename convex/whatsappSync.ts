import { v } from "convex/values";
import { maybeCompleteWhatsAppConnectionAttempt } from "./whatsappConnectionAttemptUtils";
import {
  internalAction,
  internalMutation,
  internalQuery,
  type ActionCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { whatsappSyncPool } from "./channelSyncPools";
import { resolveInboxLedgerContentType } from "./chat/inboxAudioIngest";

const DEFAULT_GRAPH_VERSION = "v22.0";

const syncTypeValidator = v.union(
  v.literal("smb_app_state_sync"),
  v.literal("history"),
);

function graphBase(): string {
  const version = process.env.META_GRAPH_API_VERSION || DEFAULT_GRAPH_VERSION;
  return `https://graph.facebook.com/${version}`;
}

type SmbAppDataResponse = {
  messaging_product?: string;
  request_id?: string;
};

type GraphErrorBody = {
  error?: {
    message?: string;
    code?: number;
    error_subcode?: number;
    type?: string;
    fbtrace_id?: string;
  };
};

async function postSmbAppData(args: {
  phoneNumberId: string;
  accessToken: string;
  syncType: "smb_app_state_sync" | "history";
}): Promise<SmbAppDataResponse> {
  const res = await fetch(`${graphBase()}/${args.phoneNumberId}/smb_app_data`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      sync_type: args.syncType,
    }),
  });
  const text = await res.text();
  let body: unknown;
  try {
    body = text.length ? JSON.parse(text) : {};
  } catch {
    body = text;
  }
  if (!res.ok) {
    const err = (body as GraphErrorBody).error;
    const msg = err?.message ?? `HTTP ${res.status}`;
    throw new Error(`${args.syncType} SMB AppData request failed: ${msg}`);
  }
  return body as SmbAppDataResponse;
}

function parseOptionalTimestamp(ts?: string): number | undefined {
  if (!ts) return undefined;
  const n = Number(ts);
  if (!Number.isFinite(n)) return undefined;
  return n < 1_000_000_000_000 ? n * 1000 : n;
}

function historyMessageContent(message: WhatsAppHistoryMessage): string {
  if (message.text?.body) return message.text.body;
  if (message.image?.caption) return message.image.caption;
  if (message.video?.caption) return message.video.caption;
  if (message.document?.caption) return message.document.caption;
  if (message.button?.text) return message.button.text;
  if (message.type === "media_placeholder") return "";
  return `<${message.type ?? "unknown"}>`;
}

function normalizePhone(value: string | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

function historyMessageContactAddress(
  threadId: string | undefined,
  message: WhatsAppHistoryMessage,
): string | undefined {
  return message.to ?? threadId ?? message.from;
}

function historyMessageDirection(
  threadId: string | undefined,
  message: WhatsAppHistoryMessage,
): "incoming" | "outgoing" {
  if (message.to) return "outgoing";
  const from = normalizePhone(message.from);
  const contact = normalizePhone(threadId);
  return from.length > 0 && contact.length > 0 && from === contact
    ? "incoming"
    : "outgoing";
}

function historyMessageContentType(message: WhatsAppHistoryMessage) {
  switch (message.type) {
    case "image":
      return "image" as const;
    case "audio":
      return "audio" as const;
    case "video":
      return "video" as const;
    case "document":
      return "document" as const;
    case "text":
      return "text" as const;
    default:
      return resolveInboxLedgerContentType(
        historyMessageContent(message),
        undefined,
        undefined,
      );
  }
}

export const initiateCoexistenceSync = internalAction({
  args: {
    channelId: v.id("channels"),
  },
  handler: async (ctx, args) => {
    await whatsappSyncPool.enqueueAction(
      ctx,
      internal.whatsappSync.requestSmbAppData,
      {
        channelId: args.channelId,
        syncType: "smb_app_state_sync",
      },
    );
    await whatsappSyncPool.enqueueAction(
      ctx,
      internal.whatsappSync.requestSmbAppData,
      {
        channelId: args.channelId,
        syncType: "history",
      },
    );
  },
});

export const requestSmbAppData = internalAction({
  args: {
    channelId: v.id("channels"),
    syncType: syncTypeValidator,
  },
  handler: async (ctx, args) => {
    const start: SyncRequestStart | null = await ctx.runMutation(
      internal.whatsappSync.internalStartSyncRequest,
      args,
    );
    if (start === null || !start.shouldRequest) return;

    try {
      const body = await postSmbAppData({
        phoneNumberId: start.phoneNumberId,
        accessToken: start.accessToken,
        syncType: args.syncType,
      });
      if (!body.request_id) {
        throw new Error(`${args.syncType} SMB AppData response missing request_id`);
      }
      await ctx.runMutation(internal.whatsappSync.internalMarkSyncRequested, {
        requestRowId: start.requestRowId,
        requestId: body.request_id,
      });
    } catch (err) {
      await ctx.runMutation(internal.whatsappSync.internalMarkSyncRequestFailed, {
        requestRowId: start.requestRowId,
        errorMessage: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  },
});

export const processHistoryChunk = internalAction({
  args: {
    chunkId: v.id("whatsappHistoryChunks"),
  },
  handler: async (ctx, args) => {
    const chunk: Doc<"whatsappHistoryChunks"> | null = await ctx.runQuery(
      internal.whatsappSync.internalGetHistoryChunk,
      { chunkId: args.chunkId },
    );
    if (chunk === null || chunk.status === "completed") return;

    await ctx.runMutation(internal.whatsappSync.internalMarkHistoryChunkProcessing, {
      chunkId: args.chunkId,
    });

    try {
      const channel: Doc<"channels"> | null = await ctx.runQuery(
        internal.channels.internalGetChannel,
        { channelId: chunk.channelId },
      );
      if (
        channel === null ||
        channel.service !== "whatsapp" ||
        !channel.phoneNumberId
      ) {
        throw new Error("WhatsApp channel not found for history chunk");
      }

      const blob = await ctx.storage.get(chunk.storageId);
      if (blob === null) {
        throw new Error("Stored WhatsApp history chunk payload not found");
      }

      const payload = JSON.parse(await blob.text()) as WhatsAppHistoryValue;
      await ingestHistoryPayload(ctx, channel, payload);

      await ctx.runMutation(internal.whatsappSync.internalMarkHistoryChunkCompleted, {
        chunkId: args.chunkId,
      });
    } catch (err) {
      await ctx.runMutation(internal.whatsappSync.internalMarkHistoryChunkFailed, {
        chunkId: args.chunkId,
        errorMessage: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  },
});

async function ingestHistoryPayload(
  ctx: ActionCtx,
  channel: Doc<"channels">,
  payload: WhatsAppHistoryValue,
) {
  for (const history of payload.history ?? []) {
    for (const thread of history.threads ?? []) {
      for (const message of thread.messages ?? []) {
        await ingestHistoryMessage(ctx, channel, thread.id, message);
      }
    }
  }

  // Meta can send follow-up history webhooks that fill in media placeholders.
  for (const message of payload.messages ?? []) {
    await ingestHistoryMessage(ctx, channel, message.to ?? message.from, message);
  }
}

async function ingestHistoryMessage(
  ctx: ActionCtx,
  channel: Doc<"channels">,
  threadId: string | undefined,
  message: WhatsAppHistoryMessage,
) {
  if (!message.id) return;
  const contactAddress = historyMessageContactAddress(threadId, message);
  if (!contactAddress) return;
  await ctx.runMutation(internal.chat.inbox.internalIngestChannelMessage, {
    channelId: channel._id,
    externalId: message.id,
    contactAddress,
    contactPhone: contactAddress,
    direction: historyMessageDirection(threadId, message),
    content: historyMessageContent(message),
    contentType: historyMessageContentType(message),
    timestampMs: parseOptionalTimestamp(message.timestamp) ?? Date.now(),
    isHistorical: true,
  });
}

export const internalStartSyncRequest = internalMutation({
  args: {
    channelId: v.id("channels"),
    syncType: syncTypeValidator,
  },
  handler: async (ctx, args): Promise<SyncRequestStart | null> => {
    const channel = await ctx.db.get(args.channelId);
    if (
      channel === null ||
      channel.service !== "whatsapp" ||
      !channel.phoneNumberId ||
      !channel.accessToken
    ) {
      return null;
    }

    const existing = await ctx.db
      .query("whatsappSyncRequests")
      .withIndex("by_channelId_and_syncType", (q) =>
        q.eq("channelId", args.channelId).eq("syncType", args.syncType),
      )
      .first();

    if (
      existing !== null &&
      (existing.requestId !== undefined ||
        existing.status === "requested" ||
        existing.status === "completed" ||
        existing.status === "not_shared")
    ) {
      return {
        shouldRequest: false,
        requestRowId: existing._id,
        phoneNumberId: channel.phoneNumberId,
        accessToken: channel.accessToken,
      };
    }

    const now = Date.now();
    const requestRowId =
      existing?._id ??
      (await ctx.db.insert("whatsappSyncRequests", {
        channelId: channel._id,
        orgId: channel.orgId,
        wabaId: channel.wabaId,
        phoneNumberId: channel.phoneNumberId,
        syncType: args.syncType,
        status: "pending",
        createdAt: now,
        updatedAt: now,
      }));

    if (existing !== null) {
      await ctx.db.patch(existing._id, {
        status: "pending",
        errorMessage: undefined,
        errorCode: undefined,
        updatedAt: now,
      });
    }

    await ctx.db.patch(channel._id, {
      ...(args.syncType === "history"
        ? {
            historySyncStatus: "requested" as const,
            historySyncProgress: channel.historySyncProgress ?? 0,
            historySyncUpdatedAt: now,
            historySyncError: undefined,
          }
        : {
            contactSyncStartedAt: channel.contactSyncStartedAt ?? now,
            contactSyncStatus: "requested" as const,
          }),
      updatedAt: now,
    });

    return {
      shouldRequest: true,
      requestRowId,
      phoneNumberId: channel.phoneNumberId,
      accessToken: channel.accessToken,
    };
  },
});

export const internalMarkSyncRequested = internalMutation({
  args: {
    requestRowId: v.id("whatsappSyncRequests"),
    requestId: v.string(),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.requestRowId);
    if (row === null) return;
    const now = Date.now();
    await ctx.db.patch(args.requestRowId, {
      requestId: args.requestId,
      status: "requested",
      requestedAt: now,
      updatedAt: now,
    });
    const channel = await ctx.db.get(row.channelId);
    if (channel === null) return;
    await ctx.db.patch(row.channelId, {
      ...(row.syncType === "history"
        ? {
            historySyncStatus: "requested" as const,
            historySyncProgress: channel.historySyncProgress ?? 0,
            historySyncUpdatedAt: now,
          }
        : {
            contactSyncStatus: "requested" as const,
            contactSyncStartedAt: channel.contactSyncStartedAt ?? now,
          }),
      updatedAt: now,
    });
  },
});

export const internalMarkSyncRequestFailed = internalMutation({
  args: {
    requestRowId: v.id("whatsappSyncRequests"),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.requestRowId);
    if (row === null) return;
    const now = Date.now();
    await ctx.db.patch(args.requestRowId, {
      status: "failed",
      errorMessage: args.errorMessage,
      updatedAt: now,
    });
    await ctx.db.patch(row.channelId, {
      ...(row.syncType === "history"
        ? {
            historySyncStatus: "failed" as const,
            historySyncError: args.errorMessage,
            historySyncUpdatedAt: now,
          }
        : {
            contactSyncStatus: "failed" as const,
          }),
      updatedAt: now,
    });
  },
});

export const internalCaptureHistoryChunk = internalMutation({
  args: {
    channelId: v.id("channels"),
    phoneNumberId: v.string(),
    phase: v.optional(v.number()),
    chunkOrder: v.optional(v.number()),
    progress: v.optional(v.number()),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args): Promise<Id<"whatsappHistoryChunks">> => {
    const channel = await ctx.db.get(args.channelId);
    if (channel === null) {
      throw new Error("Channel not found for WhatsApp history chunk");
    }
    const now = Date.now();
    const chunkId = await ctx.db.insert("whatsappHistoryChunks", {
      channelId: args.channelId,
      orgId: channel.orgId,
      phoneNumberId: args.phoneNumberId,
      phase: args.phase,
      chunkOrder: args.chunkOrder,
      progress: args.progress,
      storageId: args.storageId,
      status: "queued",
      createdAt: now,
      updatedAt: now,
    });

    const currentProgress = channel.historySyncProgress ?? 0;
    const nextProgress = Math.max(currentProgress, args.progress ?? 0);
    const shouldUpdatePhase =
      args.progress === undefined ||
      args.progress >= currentProgress ||
      channel.historySyncPhase === undefined;
    await ctx.db.patch(args.channelId, {
      historySyncStatus: nextProgress >= 100 ? "completed" : "syncing",
      historySyncProgress: nextProgress,
      ...(shouldUpdatePhase
        ? {
            historySyncPhase: args.phase,
            historySyncChunkOrder: args.chunkOrder,
          }
        : {}),
      historySyncUpdatedAt: now,
      historySyncError: undefined,
      updatedAt: now,
    });

    return chunkId;
  },
});

export const internalMarkHistoryNotShared = internalMutation({
  args: {
    phoneNumberId: v.string(),
    errorCode: v.optional(v.number()),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    const channels = await ctx.db
      .query("channels")
      .withIndex("by_phoneNumberId", (q) => q.eq("phoneNumberId", args.phoneNumberId))
      .collect();
    const channel = channels.find((c) => c.status === "connected") ?? channels[0];
    if (channel === undefined) return;
    const now = Date.now();
    await ctx.db.patch(channel._id, {
      historySyncStatus: "not_shared",
      historySyncError: args.errorMessage,
      historySyncUpdatedAt: now,
      updatedAt: now,
    });
    const req = await ctx.db
      .query("whatsappSyncRequests")
      .withIndex("by_channelId_and_syncType", (q) =>
        q.eq("channelId", channel._id).eq("syncType", "history"),
      )
      .first();
    if (req !== null) {
      await ctx.db.patch(req._id, {
        status: "not_shared",
        errorCode: args.errorCode,
        errorMessage: args.errorMessage,
        completedAt: now,
        updatedAt: now,
      });
    }
    await maybeCompleteWhatsAppConnectionAttempt(ctx, channel._id);
  },
});

export const internalGetHistoryChunk = internalQuery({
  args: {
    chunkId: v.id("whatsappHistoryChunks"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.chunkId);
  },
});

export const internalMarkHistoryChunkProcessing = internalMutation({
  args: {
    chunkId: v.id("whatsappHistoryChunks"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.chunkId, {
      status: "processing",
      startedAt: now,
      updatedAt: now,
    });
  },
});

export const internalMarkHistoryChunkCompleted = internalMutation({
  args: {
    chunkId: v.id("whatsappHistoryChunks"),
  },
  handler: async (ctx, args) => {
    const chunk = await ctx.db.get(args.chunkId);
    if (chunk === null) return;
    const now = Date.now();
    await ctx.db.patch(args.chunkId, {
      status: "completed",
      completedAt: now,
      updatedAt: now,
    });
    if ((chunk.progress ?? 0) >= 100) {
      await ctx.db.patch(chunk.channelId, {
        historySyncStatus: "completed",
        historySyncProgress: 100,
        historySyncUpdatedAt: now,
        updatedAt: now,
      });
      const req = await ctx.db
        .query("whatsappSyncRequests")
        .withIndex("by_channelId_and_syncType", (q) =>
          q.eq("channelId", chunk.channelId).eq("syncType", "history"),
        )
        .first();
      if (req !== null) {
        await ctx.db.patch(req._id, {
          status: "completed",
          completedAt: now,
          updatedAt: now,
        });
      }
      await maybeCompleteWhatsAppConnectionAttempt(ctx, chunk.channelId);
    }
  },
});

export const internalMarkHistoryChunkFailed = internalMutation({
  args: {
    chunkId: v.id("whatsappHistoryChunks"),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    const chunk = await ctx.db.get(args.chunkId);
    if (chunk === null) return;
    const now = Date.now();
    await ctx.db.patch(args.chunkId, {
      status: "failed",
      errorMessage: args.errorMessage,
      updatedAt: now,
    });
    await ctx.db.patch(chunk.channelId, {
      historySyncStatus: "failed",
      historySyncError: args.errorMessage,
      historySyncUpdatedAt: now,
      updatedAt: now,
    });
  },
});

type SyncRequestStart = {
  shouldRequest: boolean;
  requestRowId: Id<"whatsappSyncRequests">;
  phoneNumberId: string;
  accessToken: string;
};

type WhatsAppHistoryValue = {
  history?: Array<{
    metadata?: {
      phase?: number;
      chunk_order?: number;
      progress?: number;
    };
    threads?: Array<{
      id?: string;
      messages?: WhatsAppHistoryMessage[];
    }>;
    errors?: Array<{
      code?: number;
      title?: string;
      message?: string;
      error_data?: { details?: string };
    }>;
  }>;
  messages?: WhatsAppHistoryMessage[];
};

type WhatsAppHistoryMessage = {
  id?: string;
  from?: string;
  to?: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
  image?: { caption?: string; id?: string };
  video?: { caption?: string; id?: string };
  audio?: { id?: string };
  document?: { caption?: string; id?: string; filename?: string };
  button?: { text?: string };
};
