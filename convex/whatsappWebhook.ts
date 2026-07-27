import { v } from "convex/values";
import {
  httpAction,
  internalMutation,
  internalQuery,
  type ActionCtx,
  type MutationCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import {
  normalizeMetaTemplateId,
  normalizeWhatsAppTemplateCategory,
} from "./whatsappTemplateLifecycle";
import type { Doc, Id } from "./_generated/dataModel";
import {
  resolveInboxLedgerContentType,
  resolveWhatsAppAudioFiles,
} from "./chat/inboxAudioIngest";
import { applyOutboundStatusByExternalId } from "./chat/readReceipts";
import { whatsappSyncPool } from "./channelSyncPools";
import {
  isOpenWhatsAppConnectionAttempt,
  maybeCompleteWhatsAppConnectionAttempt,
} from "./whatsappConnectionAttemptUtils";
import { deleteWhatsAppHistoryStagingForChannel } from "./whatsappSync";
import { isSkippedWhatsAppContact } from "./whatsappSkipContacts";
import { markConversationAnalyticsDirty } from "./analyticsDirtyRequest";
import { cancelOrScheduleWorkflowFollowUpForMessages } from "./workflowAutomationMessageActivity";
import { inboxAiReplyPool, metaIndicatorPool } from "./inboxPools";
import { inboxPromptContent } from "../shared/inboxAttachments";
import type { IngestChannelMessageResult } from "./chat/threads";
import {
  isWhatsAppErrorMessage,
  logWhatsAppLiveErrorMessage,
} from "./whatsappHistoryDiagnostics";
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
      user_id: v.optional(v.string()),
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

  let incomingPersistenceFailed = false;

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field === "template_category_update") {
        const value = change.value;
        const metaTemplateId = normalizeMetaTemplateId(
          value.message_template_id,
        );
        const newCategory = value.new_category
          ? normalizeWhatsAppTemplateCategory(value.new_category)
          : undefined;
        if (
          !entry.id ||
          !value.message_template_name ||
          !value.message_template_language ||
          !newCategory
        ) {
          console.warn("WhatsApp template category webhook was malformed", {
            wabaId: entry.id,
          });
          continue;
        }
        try {
          const result: { matched: number; updated: number } =
            await ctx.runMutation(
              internal.whatsappTemplateWebhook.handleTemplateCategoryUpdate,
              {
                wabaId: entry.id,
                metaTemplateId,
                name: value.message_template_name,
                language: value.message_template_language,
                newCategory,
              },
            );
          if (result.matched === 0) {
            console.warn(
              "WhatsApp template category webhook had no local match",
              {
                wabaId: entry.id,
                metaTemplateId,
              },
            );
          }
        } catch (error) {
          console.error("Failed to apply WhatsApp template category webhook", {
            wabaId: entry.id,
            metaTemplateId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
        continue;
      }

      if (change.field === "message_template_status_update") {
        const value = change.value;
        const metaTemplateId = normalizeMetaTemplateId(
          value.message_template_id,
        );
        if (
          !entry.id ||
          !value.event ||
          !value.message_template_name ||
          !value.message_template_language
        ) {
          console.warn("WhatsApp template status webhook was malformed", {
            wabaId: entry.id,
          });
          continue;
        }
        try {
          const result: { matched: number; updated: number } =
            await ctx.runMutation(
              internal.whatsappTemplateWebhook.handleTemplateStatusUpdate,
              {
                wabaId: entry.id,
                event: value.event,
                metaTemplateId,
                name: value.message_template_name,
                language: value.message_template_language,
                reason: value.reason,
              },
            );
          if (result.matched === 0) {
            console.warn(
              "WhatsApp template status webhook had no local match",
              {
                wabaId: entry.id,
                metaTemplateId,
              },
            );
          }
        } catch (error) {
          console.error("Failed to apply WhatsApp template status webhook", {
            wabaId: entry.id,
            metaTemplateId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
        continue;
      }

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
              disconnectionReason: value.disconnection_info?.reason,
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
            await ctx.runMutation(
              internal.whatsappSync.internalMarkHistoryNotShared,
              {
                phoneNumberId,
                errorCode: historyError.code,
                errorMessage:
                  historyError.message ??
                  historyError.title ??
                  "WhatsApp history sync was not shared by the business.",
              },
            );
          } else {
            console.warn(
              "WhatsApp history webhook contained an error",
              historyError,
            );
          }
          continue;
        }

        const channel = await ctx.runQuery(
          internal.channels.internalGetChannelByPhoneNumberId,
          { phoneNumberId },
        );
        if (channel === null) continue;

        let shouldSync = false;
        const historyItems = value.history ?? [];
        for (const item of historyItems) {
          const metadata = item.metadata;
          if (
            metadata?.phase === undefined ||
            metadata.chunk_order === undefined
          ) {
            console.warn(
              "WhatsApp history item missing phase/chunk_order; skipping",
              {
                phoneNumberId,
                progress: metadata?.progress,
              },
            );
            continue;
          }
          const result = await ctx.runMutation(
            internal.whatsappSync.internalStageHistoryBatch,
            {
              channelId: channel._id,
              phoneNumberId,
              phase: metadata.phase,
              chunkOrder: metadata.chunk_order,
              progress: metadata.progress,
              historyThreads: (item.threads ?? []).map((thread) => ({
                id: thread.id,
                messages: thread.messages,
              })),
            },
          );
          shouldSync = shouldSync || result.shouldSync;
        }

        const anchorMetadata = historyItems.find(
          (item) =>
            item.metadata?.phase !== undefined &&
            item.metadata.chunk_order !== undefined,
        )?.metadata;
        if ((value.messages?.length ?? 0) > 0) {
          if (anchorMetadata === undefined) {
            console.warn(
              "WhatsApp history webhook had top-level messages but no batch metadata; skipping",
              { phoneNumberId, messageCount: value.messages!.length },
            );
          } else {
            const result = await ctx.runMutation(
              internal.whatsappSync.internalStageHistoryBatch,
              {
                channelId: channel._id,
                phoneNumberId,
                phase: anchorMetadata.phase,
                chunkOrder: anchorMetadata.chunk_order,
                progress: anchorMetadata.progress,
                historyThreads: [],
                standaloneMessages: value.messages,
              },
            );
            shouldSync = shouldSync || result.shouldSync;
          }
        }

        if (shouldSync) {
          await whatsappSyncPool.enqueueAction(
            ctx,
            internal.whatsappSync.syncHistoryIngestThreads,
            { channelId: channel._id },
          );
        }
        continue;
      }

      if (change.field === "smb_message_echoes") {
        const value = change.value;
        const phoneNumberId = value.metadata?.phone_number_id;
        if (!phoneNumberId) continue;
        for (const echo of value.message_echoes ?? []) {
          if (!echo.id || !echo.to) continue;
          if (isWhatsAppErrorMessage(echo)) {
            logWhatsAppLiveErrorMessage({
              source: "message_echoes",
              phoneNumberId,
              message: echo,
            });
          }
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
          if (isWhatsAppErrorMessage(message)) {
            logWhatsAppLiveErrorMessage({
              source: "messages",
              phoneNumberId,
              message,
            });
          }

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

          let files: Array<{ url: string; mimeType: string }> | undefined;
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

          await ctx.runMutation(
            internal.whatsappWebhook
              .ingestIncomingMessageAndTriggerAnalyticsWorkflowAndAi,
            {
              phoneNumberId,
              externalId: message.id,
              from: message.from,
              timestampMs: parseTimestamp(message.timestamp),
              content: extractContent(message),
              profileName: nameByWaId.get(message.from),
              files,
            },
          );
        } catch (err) {
          console.error("Failed to persist incoming WhatsApp message", err);
          incomingPersistenceFailed = true;
        }
      }

      for (const status of value.statuses ?? []) {
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

  return new Response(
    incomingPersistenceFailed ? "message persistence failed" : null,
    { status: incomingPersistenceFailed ? 500 : 200 },
  );
}

export const handleAccountUpdate = internalMutation({
  args: {
    wabaId: v.string(),
    event: v.string(),
    phoneNumber: v.optional(v.string()),
    ownerBusinessId: v.optional(v.string()),
    partnerAppId: v.optional(v.string()),
    disconnectionReason: v.optional(v.string()),
    timestampMs: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<AccountUpdateResult> => {
    await recordAccountUpdate(ctx, args);

    if (
      args.event === "PARTNER_APP_UNINSTALLED" ||
      args.event === "PARTNER_REMOVED"
    ) {
      await deleteWhatsAppConnectionForWaba(ctx, args.wabaId);
      return { shouldStartSync: false };
    }

    if (isAccountStopEvent(args.event)) {
      await stopWhatsAppConnectionForWaba(ctx, {
        wabaId: args.wabaId,
        event: args.event,
        timestampMs: args.timestampMs,
      });
      return { shouldStartSync: false };
    }

    if (args.event === "PARTNER_APP_INSTALLED") {
      return await handlePartnerAppInstalled(ctx, args);
    }

    return { shouldStartSync: false };
  },
});

export const internalHasAccountUpdate = internalQuery({
  args: {
    wabaId: v.string(),
    event: v.string(),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("whatsappAccountUpdates")
      .withIndex("by_wabaId_and_event", (q) =>
        q.eq("wabaId", args.wabaId).eq("event", args.event),
      )
      .unique();
    return row !== null;
  },
});

async function handlePartnerAppInstalled(
  ctx: MutationCtx,
  args: {
    wabaId: string;
    timestampMs?: number;
    partnerAppId?: string;
  },
): Promise<AccountUpdateResult> {
  const now = args.timestampMs ?? Date.now();
  const attempts = await ctx.db
    .query("whatsappConnectionAttempts")
    .withIndex("by_wabaId", (q) => q.eq("wabaId", args.wabaId))
    .collect();
  const openAttempt =
    attempts.find((attempt) => isOpenWhatsAppConnectionAttempt(attempt)) ??
    attempts.find((attempt) => attempt.status === "token_ready");

  const channels = await ctx.db
    .query("channels")
    .withIndex("by_wabaId", (q) => q.eq("wabaId", args.wabaId))
    .collect();
  const channel =
    channels.find((c) => c.status === "connected") ??
    channels.find((c) => c.status === "pending") ??
    channels[0];

  if (openAttempt !== undefined) {
    await ctx.db.patch(openAttempt._id, {
      status: openAttempt.status === "syncing" ? "syncing" : "connected",
      partnerAppInstalledAt: now,
      ...(channel !== undefined ? { channelId: channel._id } : {}),
      updatedAt: now,
    });
  }

  if (channel === undefined || channel.status !== "connected") {
    return { shouldStartSync: false };
  }

  return { shouldStartSync: false, channelId: channel._id };
}

function isAccountStopEvent(event: string): boolean {
  return (
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

async function deleteWhatsAppConnectionForWaba(
  ctx: MutationCtx,
  wabaId: string,
) {
  console.log(
    `[deleteWhatsAppConnectionForWaba] Deleting all data for WABA ID: ${wabaId}`,
  );

  // 1. Find all channels for this WABA
  const channels = await ctx.db
    .query("channels")
    .withIndex("by_wabaId", (q) => q.eq("wabaId", wabaId))
    .collect();

  for (const channel of channels) {
    // 2. Find and delete all conversations and associated messages/analytics
    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_channel_and_contactAddress", (q) =>
        q.eq("channelId", channel._id),
      )
      .collect();

    for (const conv of conversations) {
      // Delete messages
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_conversationId_and_createdAt", (q) =>
          q.eq("conversationId", conv._id),
        )
        .collect();
      for (const msg of messages) {
        await ctx.db.delete(msg._id);
      }

      // Delete analytics facts
      const facts = await ctx.db
        .query("conversationAnalyticsFacts")
        .withIndex("by_conversationId", (q) => q.eq("conversationId", conv._id))
        .collect();
      for (const fact of facts) {
        await ctx.db.delete(fact._id);
      }

      // Delete topic assignments
      const topics = await ctx.db
        .query("conversationTopicAssignments")
        .withIndex("by_conversationId", (q) => q.eq("conversationId", conv._id))
        .collect();
      for (const topic of topics) {
        await ctx.db.delete(topic._id);
      }

      // Delete metric entries
      const metrics = await ctx.db
        .query("analyticsMetricEntries")
        .withIndex("by_sourceConversationId", (q) =>
          q.eq("sourceConversationId", conv._id),
        )
        .collect();
      for (const metric of metrics) {
        await ctx.db.delete(metric._id);
      }

      // Delete conversation itself
      await ctx.db.delete(conv._id);
    }

    // 3. Find and delete sync requests
    const syncRequests = await ctx.db
      .query("whatsappSyncRequests")
      .withIndex("by_channelId_and_syncType", (q) =>
        q.eq("channelId", channel._id),
      )
      .collect();
    for (const req of syncRequests) {
      await ctx.db.delete(req._id);
    }

    // 4. Delete history staging rows
    await deleteWhatsAppHistoryStagingForChannel(ctx, channel._id);

    // 5. Delete the channel itself
    await ctx.db.delete(channel._id);
  }

  // 6. Delete all connection attempts
  const attempts = await ctx.db
    .query("whatsappConnectionAttempts")
    .withIndex("by_wabaId", (q) => q.eq("wabaId", wabaId))
    .collect();
  for (const attempt of attempts) {
    await ctx.db.delete(attempt._id);
  }

  // 7. Delete all account updates
  const updates = await ctx.db
    .query("whatsappAccountUpdates")
    .withIndex("by_wabaId", (q) => q.eq("wabaId", wabaId))
    .collect();
  for (const update of updates) {
    await ctx.db.delete(update._id);
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
      .withIndex("by_phoneNumberId", (q) =>
        q.eq("phoneNumberId", args.phoneNumberId),
      )
      .collect();
    const channel =
      channels.find((c) => c.status === "connected") ?? channels[0];
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
      if (!phone || isSkippedWhatsAppContact(phone)) continue;
      const name =
        item.contact?.full_name?.trim() || item.contact?.first_name?.trim();
      await ctx.runMutation(internal.customers.internalUpsertFromWebhook, {
        orgId: channel.orgId,
        service: "whatsapp",
        contactAddress: phone,
        profileName: name || undefined,
        phone,
        userId: channel.connectedByUserId,
        agentId: channel.defaultAgentId,
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

    await maybeCompleteWhatsAppConnectionAttempt(ctx, channel._id);
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
  handler: async (
    ctx,
    args,
  ): Promise<IngestChannelMessageResult | undefined> => {
    if (isSkippedWhatsAppContact(args.to)) return;

    const channels = await ctx.db
      .query("channels")
      .withIndex("by_phoneNumberId", (q) =>
        q.eq("phoneNumberId", args.phoneNumberId),
      )
      .collect();
    const channel =
      channels.find((c) => c.status === "connected") ?? channels[0];
    if (channel === undefined) return;

    const result: IngestChannelMessageResult = await ctx.runMutation(
      internal.chat.inbox.internalIngestChannelMessage,
      {
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
      },
    );
    if (result.skipped) return result;

    await markConversationAnalyticsDirty(ctx, {
      conversationId: result.conversationId,
      earliestDirtyMessageAt: args.timestampMs,
    });
    await cancelOrScheduleWorkflowFollowUpForMessages(ctx, {
      conversationId: result.conversationId,
      direction: "outgoing",
      isHistorical: false,
      messageIds: result.messageIds,
    });
    return result;
  },
});

async function resolveIncomingWhatsAppChannel(
  ctx: MutationCtx,
  args: {
    phoneNumberId: string;
    externalId: string;
    from: string;
  },
): Promise<Doc<"channels"> | null> {
  if (isSkippedWhatsAppContact(args.from)) return null;

  const existingMessage = await ctx.db
    .query("messages")
    .withIndex("by_externalId", (q) => q.eq("externalId", args.externalId))
    .unique();
  if (existingMessage !== null) return null;

  const channels = await ctx.db
    .query("channels")
    .withIndex("by_phoneNumberId", (q) =>
      q.eq("phoneNumberId", args.phoneNumberId),
    )
    .collect();

  if (channels.length === 1) return channels[0];

  for (const channel of channels) {
    const conversation = await ctx.db
      .query("conversations")
      .withIndex("by_channel_and_contactAddress", (q) =>
        q.eq("channelId", channel._id).eq("contactAddress", args.from),
      )
      .unique();
    if (conversation !== null) return channel;
  }

  const channel =
    channels.find((candidate) => candidate.status === "connected") ??
    channels[0] ??
    null;

  if (channel === null) {
    console.warn(
      `Webhook for unknown phone_number_id=${args.phoneNumberId}; skipping`,
    );
  }

  return channel;
}

export const ingestIncomingMessageAndTriggerAnalyticsWorkflowAndAi =
  internalMutation({
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
    handler: async (
      ctx,
      args,
    ): Promise<IngestChannelMessageResult | undefined> => {
      const channel = await resolveIncomingWhatsAppChannel(ctx, args);
      if (channel === null) return;

      const contentType = resolveInboxLedgerContentType(
        args.content,
        undefined,
        args.files,
      );

      const result: IngestChannelMessageResult = await ctx.runMutation(
        internal.chat.inbox.internalIngestChannelMessage,
        {
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
        },
      );
      if (result.skipped) return result;

      await markConversationAnalyticsDirty(ctx, {
        conversationId: result.conversationId,
        earliestDirtyMessageAt: args.timestampMs,
      });
      await cancelOrScheduleWorkflowFollowUpForMessages(ctx, {
        conversationId: result.conversationId,
        direction: "incoming",
        isHistorical: false,
        messageIds: result.messageIds,
      });

      if (result.shouldEnqueueAi) {
        await metaIndicatorPool.enqueueAction(
          ctx,
          internal.chat.inboxActions.internalSendMetaMarkSeen,
          {
            conversationId: result.conversationId,
            messageExternalId: args.externalId,
            requireAiHandled: true,
          },
        );
        await inboxAiReplyPool.enqueueAction(
          ctx,
          internal.chat.inbox.generateAiReplyWorker,
          {
            conversationId: result.conversationId,
            promptContent: inboxPromptContent(
              args.content,
              undefined,
              args.files,
            ),
            promptMessageId: result.agentMessageId,
            inboundExternalId: args.externalId,
          },
        );
      }

      return result;
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
      .withIndex("by_externalId", (q) =>
        q.eq("externalId", args.targetExternalId),
      )
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
  message_template_id?: string | number;
  message_template_name?: string;
  message_template_language?: string;
  reason?: string;
  previous_category?: string;
  new_category?: string;
  correct_category?: string;
  category_appeal_status?: string;
  phone_number?: string;
  waba_info?: {
    waba_id?: string;
    owner_business_id?: string;
    partner_app_id?: string;
  };
  disconnection_info?: {
    reason?: string;
    initiated_by?: string;
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
  error?: unknown;
  errors?: unknown;
  history_context?: unknown;
  [key: string]: unknown;
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
