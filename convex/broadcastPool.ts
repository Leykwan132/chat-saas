import { v } from "convex/values";
import { Workpool } from "@convex-dev/workpool";
import { components } from "./_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { ingestChannelMessage } from "./chat/threads";
import { getUserByWorkosId } from "./teamHelpers";
import { logConversationEvent } from "./conversationLogs";
import { buildWhatsAppTemplateSendPayloadWithContent } from "./whatsappTemplateSendPayload";
import { ensureWhatsAppRecipientPhone } from "./whatsappPhone";
import { formatBroadcastMessageContent } from "./broadcastChatContent";
import { markConversationAnalyticsDirty } from "./analyticsDirtyRequest";
import { cancelOrScheduleWorkflowFollowUpForMessages } from "./workflowAutomationMessageActivity";
import type { BroadcastHeaderAsset } from "../shared/broadcastMessage";

type BroadcastWorkerContext = {
  recipient: Doc<"whatsappBroadcastRecipients">;
  schedule: Doc<"whatsappBroadcastSchedules">;
  customer: Doc<"customers">;
  channel: Doc<"channels">;
};

type BroadcastWorkerResult =
  | {
      skipped: true;
      msg: string;
    }
  | {
      ok: true;
      externalId?: string;
      renderedContent: string;
      headerAsset?: BroadcastHeaderAsset;
    };

export const broadcastPool = new Workpool(
  components.broadcastWorkpool,
  { maxParallelism: 3 }, // Rate-limiting safety for Meta Graph API
);

const DEFAULT_GRAPH_VERSION = "v22.0";

function graphBase(): string {
  const version = process.env.META_GRAPH_API_VERSION || DEFAULT_GRAPH_VERSION;
  return `https://graph.facebook.com/${version}`;
}

function resolveAccessToken(channel: Doc<"channels">): string {
  const token = (channel.accessToken ?? "").trim();
  if (!token) {
    throw new Error("WhatsApp channel has no access token. Reconnect in Channels.");
  }
  return token;
}

export const getBroadcastWorkerContext = internalQuery({
  args: {
    recipientId: v.id("whatsappBroadcastRecipients"),
  },
  handler: async (ctx, args) => {
    const recipient = await ctx.db.get(args.recipientId);
    if (recipient === null) return null;
    const schedule = await ctx.db.get(recipient.scheduleId);
    if (schedule === null) return null;
    const customer = await ctx.db.get(recipient.customerId);
    if (customer === null) return null;
    const channel = await ctx.db.get(schedule.channelId);
    if (channel === null) return null;
    return {
      recipient,
      schedule,
      customer,
      channel,
    };
  },
});

export const broadcastWorker = internalAction({
  args: {
    recipientId: v.id("whatsappBroadcastRecipients"),
  },
  handler: async (ctx, args): Promise<BroadcastWorkerResult> => {
    const context: BroadcastWorkerContext | null = await ctx.runQuery(
      internal.broadcastPool.getBroadcastWorkerContext,
      { recipientId: args.recipientId },
    );
    if (context === null) {
      throw new Error(`Broadcast worker context not found for recipient: ${args.recipientId}`);
    }
    const { recipient, schedule, customer, channel } = context;

    if (recipient.status === "completed") {
      return { skipped: true, msg: "Already sent" };
    }

    const token = resolveAccessToken(channel);
    const phoneNumberId = channel.phoneNumberId?.trim();
    if (!phoneNumberId) {
      throw new Error("Phone number ID is missing for this channel.");
    }
    const rawTo = customer.contactAddress.trim();
    if (!rawTo) {
      throw new Error(`Customer ${customer._id} has no contactAddress`);
    }
    const to = ensureWhatsAppRecipientPhone(rawTo);

    const { template, renderedContent, headerAsset } = await buildWhatsAppTemplateSendPayloadWithContent(ctx, {
      orgId: schedule.orgId,
      channelId: schedule.channelId,
      templateName: schedule.templateName,
      templateLanguage: schedule.templateLanguage,
      customerId: customer._id,
    });

    const skipSend = process.env.SKIP_MESSAGE_TEMPLATE_SEND === "true";
    if (skipSend) {
      return {
        ok: true,
        externalId: "demo-id-" + Math.random().toString(36).slice(2, 9),
        renderedContent,
        ...(headerAsset ? { headerAsset } : {}),
      };
    }

    const url = `${graphBase()}/${phoneNumberId}/messages`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template,
      }),
    });

    const text = await res.text();
    let body: {
      error?: { message?: string };
      messages?: Array<{ id?: string }>;
    } | null;
    try {
      body = text.length
        ? (JSON.parse(text) as {
            error?: { message?: string };
            messages?: Array<{ id?: string }>;
          })
        : null;
    } catch {
      body = null;
    }

    if (!res.ok) {
      const errMsg = body?.error?.message ?? `HTTP ${res.status}: ${text}`;
      throw new Error(errMsg);
    }

    const externalId = body?.messages?.[0]?.id;
    return { ok: true, externalId, renderedContent, ...(headerAsset ? { headerAsset } : {}) };
  },
});

export const broadcastComplete = internalMutation({
  args: {
    workId: v.string(),
    context: v.object({
      recipientId: v.id("whatsappBroadcastRecipients"),
    }),
    result: v.union(
      v.object({ kind: v.literal("success"), returnValue: v.any() }),
      v.object({ kind: v.literal("failed"), error: v.string() }),
      v.object({ kind: v.literal("canceled") }),
    ),
  },
  handler: async (ctx, args) => {
    const { recipientId } = args.context;
    const recipient = await ctx.db.get(recipientId);
    if (recipient === null) return;

    const schedule = await ctx.db.get(recipient.scheduleId);
    if (schedule === null) return;

    const customer = await ctx.db.get(recipient.customerId);
    if (customer === null) return;

    const isSuccess = args.result.kind === "success" && args.result.returnValue?.ok;
    const errorMsg = args.result.kind === "failed" ? args.result.error : (args.result.kind === "canceled" ? "Canceled" : undefined);

    let messageId: Id<"messages"> | undefined;

    if (isSuccess && args.result.kind === "success") {
      const returnValue = args.result.returnValue;
      try {
        const renderedContent =
          typeof returnValue.renderedContent === "string"
            ? returnValue.renderedContent.trim()
            : "";
        const chatContent = formatBroadcastMessageContent(renderedContent);

        const sentAt = Date.now();
        const ingestResult = await ingestChannelMessage(ctx, {
          channelId: schedule.channelId,
          externalId: returnValue.externalId,
          contactAddress: customer.contactAddress,
          contactName: customer.name ?? undefined,
          direction: "outgoing",
          content: chatContent,
          contentType: "text",
          messageKind: "broadcast",
          broadcastPresentation: returnValue.headerAsset
            ? { headerAsset: returnValue.headerAsset }
            : {},
          timestampMs: sentAt,
          assignedAgentId: schedule.agentId,
          authorUserId: schedule.createdBy,
        });
        if (!ingestResult.skipped) {
          await markConversationAnalyticsDirty(ctx, {
            conversationId: ingestResult.conversationId,
            earliestDirtyMessageAt: sentAt,
          });
          await cancelOrScheduleWorkflowFollowUpForMessages(ctx, {
            conversationId: ingestResult.conversationId,
            direction: "outgoing",
            isHistorical: false,
            messageIds: ingestResult.messageIds,
          });
        }

        // Resolve message ID
        if (returnValue.externalId) {
          const msg = await ctx.db
            .query("messages")
            .withIndex("by_externalId", (q) => q.eq("externalId", returnValue.externalId))
            .unique();
          if (msg) {
            messageId = msg._id;
          }
        }

        // Log the broadcast_sent event
        const userDoc = schedule.createdBy ? await getUserByWorkosId(ctx, schedule.createdBy) : null;
        let actorName: string | undefined;
        if (userDoc) {
          const nameParts = [userDoc.firstName, userDoc.lastName].filter(Boolean);
          actorName = nameParts.length > 0 ? nameParts.join(" ") : userDoc.email;
        }

        await logConversationEvent(ctx, {
          conversationId: ingestResult.conversationId,
          action: "broadcast_sent",
          actor: {
            type: "user",
            userId: schedule.createdBy,
            name: actorName,
          },
          metadata: {
            templateName: schedule.templateName,
            scheduleId: schedule._id,
          },
        });
      } catch (err) {
        console.error("Failed to ingest outgoing broadcast message record / log event:", err);
      }
    }

    // Update recipient status
    await ctx.db.patch(recipientId, {
      status: isSuccess ? "completed" : "failed",
      processedAt: Date.now(),
      errorMessage: errorMsg,
      messageId,
    });

    // Update parent schedule counts
    const currentOk = schedule.okCount ?? 0;
    const currentFail = schedule.failCount ?? 0;
    const newOk = isSuccess ? currentOk + 1 : currentOk;
    const newFail = isSuccess ? currentFail : currentFail + 1;

    const patch: Partial<Doc<"whatsappBroadcastSchedules">> = {
      okCount: newOk,
      failCount: newFail,
    };

    if (newOk + newFail >= schedule.totalCount) {
      if (schedule.status === "processing") {
        patch.status = "completed";
        patch.processedAt = Date.now();
      }
    }

    await ctx.db.patch(schedule._id, patch);
  },
});
