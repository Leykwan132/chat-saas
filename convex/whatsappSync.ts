import { v } from "convex/values";
import { maybeCompleteWhatsAppConnectionAttempt } from "./whatsappConnectionAttemptUtils";
import {
  internalAction,
  internalMutation,
  internalQuery,
  type MutationCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { whatsappSyncPool } from "./channelSyncPools";
import { resolveInboxLedgerContentType } from "./chat/inboxAudioIngest";
import { leadLabelPool } from "./inboxPools";
import { isSkippedWhatsAppContact } from "./whatsappSkipContacts";

const DEFAULT_GRAPH_VERSION = "v22.0";
const META_COEXISTENCE_BATCH_COUNT = 3;

const syncTypeValidator = v.union(
  v.literal("smb_app_state_sync"),
  v.literal("history"),
);

// Meta history payloads include extra keys (from_user_id, sticker, …) that change over time.
const stagedHistoryMessageValidator = v.any();

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

export function parseOptionalTimestamp(ts?: string): number | undefined {
  if (!ts) return undefined;
  const n = Number(ts);
  if (!Number.isFinite(n)) return undefined;
  return n < 1_000_000_000_000 ? n * 1000 : n;
}

export function mapHistoryContextStatus(
  status?: string,
): "sent" | "delivered" | "read" | "failed" | undefined {
  switch (status?.toLowerCase()) {
    case "sent":
    case "pending":
      return "sent";
    case "delivered":
      return "delivered";
    case "read":
    case "played":
      return "read";
    case "failed":
    case "error":
      return "failed";
    default:
      return undefined;
  }
}

export function historyMessageContent(message: WhatsAppHistoryMessage): string {
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

export function historyMessageContactAddress(
  threadId: string | undefined,
  message: WhatsAppHistoryMessage,
): string | undefined {
  return message.to ?? threadId ?? message.from;
}

export function historyMessageDirection(
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

export function historyMessageContentType(
  message: WhatsAppHistoryMessage,
): Doc<"whatsappHistoryIngestMessages">["contentType"] {
  switch (message.type) {
    case "image":
      return "image";
    case "audio":
      return "audio";
    case "video":
      return "video";
    case "document":
      return "document";
    case "text":
      return "text";
    default: {
      const resolved = resolveInboxLedgerContentType(
        historyMessageContent(message),
        undefined,
        undefined,
      );
      return resolved === "unknown" ? "text" : resolved;
    }
  }
}

function resolveBatchKey(
  phase?: number,
  chunkOrder?: number,
): { phase: number; chunkOrder: number } | null {
  if (phase === undefined || chunkOrder === undefined) {
    return null;
  }
  return { phase, chunkOrder };
}

function cappedReceiveProgress(metaProgress: number | undefined, current: number): number {
  const next = Math.max(current, metaProgress ?? 0);
  return Math.min(90, next);
}

function ingestDisplayProgress(
  completedBatches: number,
  totalBatches: number,
): number {
  if (totalBatches <= 0) return 90;
  return 90 + Math.floor((completedBatches / totalBatches) * 9);
}

const stagingSyncStatuses = ["pending", "syncing", "completed", "failed"] as const;

export async function deleteWhatsAppHistoryStagingForChannel(
  ctx: MutationCtx,
  channelId: Id<"channels">,
) {
  for (const status of stagingSyncStatuses) {
    const ingestThreads = await ctx.db
      .query("whatsappHistoryIngestThreads")
      .withIndex("by_channelId_and_status", (q) =>
        q.eq("channelId", channelId).eq("status", status),
      )
      .collect();
    for (const thread of ingestThreads) {
      const messages = await ctx.db
        .query("whatsappHistoryIngestMessages")
        .withIndex("by_ingestThreadId_and_timestampMs", (q) =>
          q.eq("ingestThreadId", thread._id),
        )
        .collect();
      for (const message of messages) {
        await ctx.db.delete(message._id);
      }
      await ctx.db.delete(thread._id);
    }
  }

  const batches = await ctx.db
    .query("whatsappHistorySyncBatches")
    .withIndex("by_channelId", (q) => q.eq("channelId", channelId))
    .collect();
  for (const batch of batches) {
    await ctx.db.delete(batch._id);
  }
}

async function listBatchesForChannel(
  ctx: MutationCtx,
  channelId: Id<"channels">,
): Promise<Doc<"whatsappHistorySyncBatches">[]> {
  return await ctx.db
    .query("whatsappHistorySyncBatches")
    .withIndex("by_channelId", (q) => q.eq("channelId", channelId))
    .take(64);
}

async function upsertBatch(
  ctx: MutationCtx,
  args: {
    channelId: Id<"channels">;
    orgId: string;
    phoneNumberId: string;
    phase?: number;
    chunkOrder?: number;
    progress?: number;
  },
): Promise<{ batchId: Id<"whatsappHistorySyncBatches">; isNewBatch: boolean }> {
  const key = resolveBatchKey(args.phase, args.chunkOrder);
  if (key === null) {
    throw new Error("WhatsApp history batch requires phase and chunkOrder");
  }
  const existing = await ctx.db
    .query("whatsappHistorySyncBatches")
    .withIndex("by_channelId_and_phase_and_chunkOrder", (q) =>
      q.eq("channelId", args.channelId).eq("phase", key.phase).eq("chunkOrder", key.chunkOrder),
    )
    .first();

  const now = Date.now();
  if (existing !== null) {
    await ctx.db.patch(existing._id, {
      progress: Math.max(existing.progress ?? 0, args.progress ?? 0),
      updatedAt: now,
      ...(existing.status === "completed"
        ? { status: "pending" as const, completedAt: undefined }
        : {}),
    });
    return { batchId: existing._id, isNewBatch: false };
  }

  const batchId = await ctx.db.insert("whatsappHistorySyncBatches", {
    channelId: args.channelId,
    orgId: args.orgId,
    phoneNumberId: args.phoneNumberId,
    phase: key.phase,
    chunkOrder: key.chunkOrder,
    progress: args.progress,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  });
  return { batchId, isNewBatch: true };
}

async function upsertIngestThread(
  ctx: MutationCtx,
  args: {
    batchId: Id<"whatsappHistorySyncBatches">;
    channelId: Id<"channels">;
    orgId: string;
    phoneNumberId: string;
    whatsappThreadId: string;
    contactAddress: string;
  },
): Promise<Id<"whatsappHistoryIngestThreads">> {
  const existing = await ctx.db
    .query("whatsappHistoryIngestThreads")
    .withIndex("by_batchId_and_whatsappThreadId", (q) =>
      q.eq("batchId", args.batchId).eq("whatsappThreadId", args.whatsappThreadId),
    )
    .first();

  const now = Date.now();
  if (existing !== null) {
    if (existing.status === "completed") {
      await ctx.db.patch(existing._id, {
        status: "pending",
        completedAt: undefined,
        errorMessage: undefined,
        updatedAt: now,
      });
    }
    return existing._id;
  }

  return await ctx.db.insert("whatsappHistoryIngestThreads", {
    batchId: args.batchId,
    channelId: args.channelId,
    orgId: args.orgId,
    phoneNumberId: args.phoneNumberId,
    whatsappThreadId: args.whatsappThreadId,
    contactAddress: args.contactAddress,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  });
}

async function upsertIngestMessage(
  ctx: MutationCtx,
  args: {
    channelId: Id<"channels">;
    orgId: string;
    batchId: Id<"whatsappHistorySyncBatches">;
    ingestThreadId: Id<"whatsappHistoryIngestThreads">;
    whatsappThreadId: string;
    message: WhatsAppHistoryMessage;
  },
): Promise<void> {
  if (!args.message.id) return;
  const now = Date.now();
  const existing = await ctx.db
    .query("whatsappHistoryIngestMessages")
    .withIndex("by_channelId_and_externalId", (q) =>
      q.eq("channelId", args.channelId).eq("externalId", args.message.id!),
    )
    .first();

  const row = {
    channelId: args.channelId,
    orgId: args.orgId,
    batchId: args.batchId,
    ingestThreadId: args.ingestThreadId,
    externalId: args.message.id!,
    whatsappThreadId: args.whatsappThreadId,
    direction: historyMessageDirection(args.whatsappThreadId, args.message),
    content: historyMessageContent(args.message),
    contentType: historyMessageContentType(args.message),
    timestampMs: parseOptionalTimestamp(args.message.timestamp) ?? now,
    rawType: args.message.type,
    historyStatus: mapHistoryContextStatus(args.message.history_context?.status),
    updatedAt: now,
  };

  if (existing !== null) {
    await ctx.db.patch(existing._id, row);
    return;
  }

  await ctx.db.insert("whatsappHistoryIngestMessages", {
    ...row,
    createdAt: now,
  });
}

async function stageHistoryMessage(
  ctx: MutationCtx,
  args: {
    batchId: Id<"whatsappHistorySyncBatches">;
    channelId: Id<"channels">;
    orgId: string;
    phoneNumberId: string;
    threadId: string | undefined;
    message: WhatsAppHistoryMessage;
  },
): Promise<void> {
  if (!args.message.id) return;
  const contactAddress = historyMessageContactAddress(args.threadId, args.message);
  if (!contactAddress) return;
  if (
    isSkippedWhatsAppContact(contactAddress) ||
    isSkippedWhatsAppContact(args.threadId) ||
    isSkippedWhatsAppContact(args.message.from) ||
    isSkippedWhatsAppContact(args.message.to)
  ) {
    return;
  }
  const whatsappThreadId = args.threadId ?? contactAddress;
  const ingestThreadId = await upsertIngestThread(ctx, {
    batchId: args.batchId,
    channelId: args.channelId,
    orgId: args.orgId,
    phoneNumberId: args.phoneNumberId,
    whatsappThreadId,
    contactAddress,
  });
  await upsertIngestMessage(ctx, {
    channelId: args.channelId,
    orgId: args.orgId,
    batchId: args.batchId,
    ingestThreadId,
    whatsappThreadId,
    message: args.message,
  });
}

async function maybeCompleteAllBatchesForChannel(
  ctx: MutationCtx,
  channelId: Id<"channels">,
): Promise<boolean> {
  const pending = await ctx.db
    .query("whatsappHistoryIngestThreads")
    .withIndex("by_channelId_and_status", (q) =>
      q.eq("channelId", channelId).eq("status", "pending"),
    )
    .take(1);
  const syncing = await ctx.db
    .query("whatsappHistoryIngestThreads")
    .withIndex("by_channelId_and_status", (q) =>
      q.eq("channelId", channelId).eq("status", "syncing"),
    )
    .take(1);
  if (pending.length > 0 || syncing.length > 0) {
    return false;
  }

  const batches = await listBatchesForChannel(ctx, channelId);
  if (batches.length === 0) {
    return false;
  }

  const now = Date.now();
  const failed = await ctx.db
    .query("whatsappHistoryIngestThreads")
    .withIndex("by_channelId_and_status", (q) =>
      q.eq("channelId", channelId).eq("status", "failed"),
    )
    .take(1);

  if (failed.length > 0) {
    for (const batch of batches) {
      if (batch.status === "completed") continue;
      await ctx.db.patch(batch._id, {
        status: "failed",
        errorMessage: "One or more threads failed to import",
        updatedAt: now,
      });
    }
    return false;
  }

  for (const batch of batches) {
    if (batch.status === "completed") continue;
    await ctx.db.patch(batch._id, {
      status: "completed",
      completedAt: now,
      updatedAt: now,
    });
  }
  return true;
}

async function updateChannelIngestProgress(
  ctx: MutationCtx,
  channelId: Id<"channels">,
): Promise<void> {
  const channel = await ctx.db.get(channelId);
  if (channel === null) return;

  const batches = await listBatchesForChannel(ctx, channelId);
  const total = batches.length;
  const completed = batches.filter((b) => b.status === "completed").length;
  await ctx.db.patch(channelId, {
    historySyncCompletedBatchCount: completed,
    historySyncTotalBatchCount: total,
    historySyncProgress: ingestDisplayProgress(completed, total),
    historySyncUpdatedAt: Date.now(),
    updatedAt: Date.now(),
  });
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

export const syncHistoryIngestThreads = internalAction({
  args: {
    channelId: v.id("channels"),
  },
  handler: async (ctx, args) => {
    const channel: Doc<"channels"> | null = await ctx.runQuery(
      internal.channels.internalGetChannel,
      { channelId: args.channelId },
    );
    if (
      channel === null ||
      channel.service !== "whatsapp" ||
      !channel.phoneNumberId
    ) {
      throw new Error("WhatsApp channel not found for history sync");
    }

    const touchedConversations = new Set<Id<"conversations">>();
    let processedContacts = 0;

    while (processedContacts < 32) {
      const nextContact: string | null = await ctx.runQuery(
        internal.whatsappSync.internalGetNextPendingIngestContact,
        { channelId: args.channelId },
      );
      if (nextContact === null) break;

      const work = await ctx.runMutation(
        internal.whatsappSync.internalBeginIngestContact,
        { channelId: args.channelId, whatsappThreadId: nextContact },
      );
      if (work === null) break;

      try {
        for (const message of work.messages) {
          const result = await ctx.runMutation(
            internal.chat.inbox.internalIngestHistoricalChannelMessage,
            {
              channelId: channel._id,
              externalId: message.externalId,
              contactAddress: message.contactAddress,
              contactPhone: message.contactAddress,
              direction: message.direction,
              content: message.content,
              contentType: message.contentType,
              timestampMs: message.timestampMs,
              isHistorical: true,
              outboundStatus: message.outboundStatus,
            },
          );
          if (!result.skipped) {
            await ctx.runMutation(internal.analyticsRefreshRequest.request, {
              conversationId: result.conversationId,
            });
            touchedConversations.add(result.conversationId);
          }
        }

        await ctx.runMutation(internal.whatsappSync.internalCompleteIngestContact, {
          channelId: args.channelId,
          whatsappThreadId: nextContact,
          ingestThreadIds: work.ingestThreadIds,
        });
      } catch (err) {
        await ctx.runMutation(internal.whatsappSync.internalFailIngestContact, {
          channelId: args.channelId,
          whatsappThreadId: nextContact,
          ingestThreadIds: work.ingestThreadIds,
          errorMessage: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }

      processedContacts += 1;
    }

    const state = await ctx.runQuery(internal.whatsappSync.internalGetIngestSyncState, {
      channelId: args.channelId,
    });

    if (state.pendingContactCount > 0) {
      await whatsappSyncPool.enqueueAction(
        ctx,
        internal.whatsappSync.syncHistoryIngestThreads,
        { channelId: args.channelId },
      );
      return;
    }

    if (state.allBatchesCompleted) {
      await ctx.runMutation(internal.whatsappSync.internalCompleteHistorySync, {
        channelId: args.channelId,
      });

      for (const conversationId of touchedConversations) {
        await leadLabelPool.enqueueAction(
          ctx,
          internal.chat.inboxActions.internalLabelLeadOnSync,
          { conversationId },
          { retry: true },
        );
      }
    }
  },
});

export const internalStageHistoryBatch = internalMutation({
  args: {
    channelId: v.id("channels"),
    phoneNumberId: v.string(),
    phase: v.optional(v.number()),
    chunkOrder: v.optional(v.number()),
    progress: v.optional(v.number()),
    historyThreads: v.array(
      v.object({
        id: v.optional(v.string()),
        messages: v.optional(v.array(stagedHistoryMessageValidator)),
      }),
    ),
    standaloneMessages: v.optional(v.array(stagedHistoryMessageValidator)),
  },
  handler: async (ctx, args): Promise<{ shouldSync: boolean; isNewBatch: boolean }> => {
    const channel = await ctx.db.get(args.channelId);
    if (channel === null) {
      throw new Error("Channel not found for WhatsApp history batch");
    }

    const batchKey = resolveBatchKey(args.phase, args.chunkOrder);
    if (batchKey === null) {
      return { shouldSync: false, isNewBatch: false };
    }

    const { batchId, isNewBatch } = await upsertBatch(ctx, {
      channelId: args.channelId,
      orgId: channel.orgId,
      phoneNumberId: args.phoneNumberId,
      phase: args.phase,
      chunkOrder: args.chunkOrder,
      progress: args.progress,
    });

    for (const thread of args.historyThreads) {
      for (const raw of thread.messages ?? []) {
        await stageHistoryMessage(ctx, {
          batchId,
          channelId: args.channelId,
          orgId: channel.orgId,
          phoneNumberId: args.phoneNumberId,
          threadId: thread.id,
          message: raw as WhatsAppHistoryMessage,
        });
      }
    }

    for (const raw of args.standaloneMessages ?? []) {
      const message = raw as WhatsAppHistoryMessage;
      await stageHistoryMessage(ctx, {
        batchId,
        channelId: args.channelId,
        orgId: channel.orgId,
        phoneNumberId: args.phoneNumberId,
        threadId: message.to ?? message.from,
        message,
      });
    }

    const now = Date.now();
    const currentProgress = channel.historySyncProgress ?? 0;
    const nextProgress = cappedReceiveProgress(args.progress, currentProgress);
    const shouldUpdatePhase =
      args.progress === undefined ||
      (args.progress ?? 0) >= currentProgress ||
      channel.historySyncPhase === undefined;

    await ctx.db.patch(args.channelId, {
      historySyncStatus:
        channel.historySyncStatus === "requested" ||
        channel.historySyncStatus === undefined
          ? "syncing"
          : channel.historySyncStatus === "completed"
            ? "syncing"
            : channel.historySyncStatus,
      historySyncProgress:
        channel.historySyncTotalBatchCount !== undefined
          ? channel.historySyncProgress
          : nextProgress,
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

    const batches = await listBatchesForChannel(ctx, args.channelId);
    const maxProgress = batches.reduce((max, b) => Math.max(max, b.progress ?? 0), 0);
    const refreshed = await ctx.db.get(args.channelId);
    const shouldSync =
      batches.length >= META_COEXISTENCE_BATCH_COUNT &&
      maxProgress >= 100 &&
      refreshed?.historySyncStatus === "syncing" &&
      refreshed?.historySyncTotalBatchCount === undefined;

    if (shouldSync) {
      await ctx.db.patch(args.channelId, {
        historySyncProgress: 90,
        historySyncTotalBatchCount: batches.length,
        historySyncCompletedBatchCount: 0,
        historySyncUpdatedAt: now,
        updatedAt: now,
      });
    }

    return { shouldSync, isNewBatch };
  },
});

export const internalGetNextPendingIngestContact = internalQuery({
  args: {
    channelId: v.id("channels"),
  },
  handler: async (ctx, args) => {
    const pending = await ctx.db
      .query("whatsappHistoryIngestThreads")
      .withIndex("by_channelId_and_status", (q) =>
        q.eq("channelId", args.channelId).eq("status", "pending"),
      )
      .first();
    return pending?.whatsappThreadId ?? null;
  },
});

export const internalBeginIngestContact = internalMutation({
  args: {
    channelId: v.id("channels"),
    whatsappThreadId: v.string(),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("whatsappHistoryIngestThreads")
      .withIndex("by_channelId_and_whatsappThreadId", (q) =>
        q
          .eq("channelId", args.channelId)
          .eq("whatsappThreadId", args.whatsappThreadId),
      )
      .collect();
    const pendingRows = rows.filter((row) => row.status === "pending");
    if (pendingRows.length === 0) return null;

    if (isSkippedWhatsAppContact(args.whatsappThreadId)) {
      const now = Date.now();
      for (const row of pendingRows) {
        await ctx.db.patch(row._id, {
          status: "completed",
          completedAt: now,
          updatedAt: now,
        });
      }
      await maybeCompleteAllBatchesForChannel(ctx, args.channelId);
      await updateChannelIngestProgress(ctx, args.channelId);
      return {
        ingestThreadIds: pendingRows.map((row) => row._id),
        messages: [],
      };
    }

    const now = Date.now();
    for (const row of pendingRows) {
      await ctx.db.patch(row._id, { status: "syncing", updatedAt: now });
      const batch = await ctx.db.get(row.batchId);
      if (batch !== null && batch.status === "pending") {
        await ctx.db.patch(batch._id, { status: "syncing", updatedAt: now });
      }
    }

    const messages: Array<{
      externalId: string;
      contactAddress: string;
      direction: "incoming" | "outgoing";
      content: string;
      contentType: Doc<"messages">["contentType"];
      timestampMs: number;
      outboundStatus?: "sent" | "delivered" | "read" | "failed";
    }> = [];

    for (const row of pendingRows) {
      const staged = await ctx.db
        .query("whatsappHistoryIngestMessages")
        .withIndex("by_ingestThreadId_and_timestampMs", (q) =>
          q.eq("ingestThreadId", row._id),
        )
        .collect();
      for (const message of staged) {
        messages.push({
          externalId: message.externalId,
          contactAddress: row.contactAddress,
          direction: message.direction,
          content: message.content,
          contentType: message.contentType,
          timestampMs: message.timestampMs,
          outboundStatus:
            message.direction === "outgoing"
              ? message.historyStatus ?? "sent"
              : undefined,
        });
      }
    }

    const deduped = new Map<string, (typeof messages)[number]>();
    for (const message of messages) {
      deduped.set(message.externalId, message);
    }

    return {
      ingestThreadIds: pendingRows.map((row) => row._id),
      messages: [...deduped.values()].sort((a, b) => a.timestampMs - b.timestampMs),
    };
  },
});

export const internalCompleteIngestContact = internalMutation({
  args: {
    channelId: v.id("channels"),
    whatsappThreadId: v.string(),
    ingestThreadIds: v.array(v.id("whatsappHistoryIngestThreads")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    for (const ingestThreadId of args.ingestThreadIds) {
      const row = await ctx.db.get(ingestThreadId);
      if (row === null) continue;
      await ctx.db.patch(ingestThreadId, {
        status: "completed",
        completedAt: now,
        updatedAt: now,
      });
    }

    await maybeCompleteAllBatchesForChannel(ctx, args.channelId);
    await updateChannelIngestProgress(ctx, args.channelId);
  },
});

export const internalFailIngestContact = internalMutation({
  args: {
    channelId: v.id("channels"),
    whatsappThreadId: v.string(),
    ingestThreadIds: v.array(v.id("whatsappHistoryIngestThreads")),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    for (const ingestThreadId of args.ingestThreadIds) {
      const row = await ctx.db.get(ingestThreadId);
      if (row === null) continue;
      await ctx.db.patch(ingestThreadId, {
        status: "failed",
        errorMessage: args.errorMessage,
        updatedAt: now,
      });
      await ctx.db.patch(row.batchId, {
        status: "failed",
        errorMessage: args.errorMessage,
        updatedAt: now,
      });
    }

    await ctx.db.patch(args.channelId, {
      historySyncStatus: "failed",
      historySyncError: args.errorMessage,
      historySyncUpdatedAt: now,
      updatedAt: now,
    });
  },
});

export const internalGetIngestSyncState = internalQuery({
  args: {
    channelId: v.id("channels"),
  },
  handler: async (ctx, args) => {
    const pending = await ctx.db
      .query("whatsappHistoryIngestThreads")
      .withIndex("by_channelId_and_status", (q) =>
        q.eq("channelId", args.channelId).eq("status", "pending"),
      )
      .take(1);
    const syncing = await ctx.db
      .query("whatsappHistoryIngestThreads")
      .withIndex("by_channelId_and_status", (q) =>
        q.eq("channelId", args.channelId).eq("status", "syncing"),
      )
      .take(1);
    const batches = await ctx.db
      .query("whatsappHistorySyncBatches")
      .withIndex("by_channelId", (q) => q.eq("channelId", args.channelId))
      .take(64);

    return {
      pendingContactCount: pending.length + syncing.length,
      allBatchesCompleted:
        batches.length > 0 && batches.every((batch) => batch.status === "completed"),
    };
  },
});

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

export const internalCompleteHistorySync = internalMutation({
  args: {
    channelId: v.id("channels"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.channelId, {
      historySyncStatus: "completed",
      historySyncProgress: 100,
      historySyncCompletedBatchCount: undefined,
      historySyncTotalBatchCount: undefined,
      historySyncUpdatedAt: now,
      updatedAt: now,
    });
    const req = await ctx.db
      .query("whatsappSyncRequests")
      .withIndex("by_channelId_and_syncType", (q) =>
        q.eq("channelId", args.channelId).eq("syncType", "history"),
      )
      .first();
    if (req !== null) {
      await ctx.db.patch(req._id, {
        status: "completed",
        completedAt: now,
        updatedAt: now,
      });
    }
    await maybeCompleteWhatsAppConnectionAttempt(ctx, args.channelId);
  },
});

type SyncRequestStart = {
  shouldRequest: boolean;
  requestRowId: Id<"whatsappSyncRequests">;
  phoneNumberId: string;
  accessToken: string;
};

export type WhatsAppHistoryMessage = {
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
  history_context?: { status?: string };
};
