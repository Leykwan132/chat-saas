import { v } from "convex/values";
import {
  action,
  mutation,
  query,
  type ActionCtx,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { getAuthContext, PERSONAL_ORG_FALLBACK, resolveChannelOrgId } from "./authUtils";
import { broadcastPool } from "./broadcastPool";
import { buildWhatsAppTemplateSendPayload } from "./whatsappTemplateSendPayload";
import { ensureWhatsAppRecipientPhone } from "./whatsappPhone";

const DEFAULT_GRAPH_VERSION = "v22.0";
const MAX_BATCH_SEND = 50;

async function assertAgentInOrg(
  ctx: QueryCtx | MutationCtx,
  agentId: Id<"agents">,
  orgId: string,
  userId: string,
) {
  const agent = await ctx.db.get(agentId);
  if (agent === null) {
    throw new Error("Agent not found");
  }
  const normalizedOrgId =
    !orgId || orgId === "personal" ? PERSONAL_ORG_FALLBACK : orgId;
  const agentOrgId =
    !agent.orgId || agent.orgId === "personal"
      ? PERSONAL_ORG_FALLBACK
      : agent.orgId;
  if (agentOrgId !== PERSONAL_ORG_FALLBACK) {
    if (agentOrgId !== normalizedOrgId) {
      throw new Error("Agent not found");
    }
    return agent;
  }
  if (agent.userId !== userId) {
    throw new Error("Agent not found");
  }
  return agent;
}

type BatchSendResult = {
  results: Array<{ phone: string; ok: boolean; error?: string; sentAt: number }>;
  okCount: number;
  failCount: number;
};

async function sendTemplateBatchToPhones(
  ctx: ActionCtx,
  channelId: Id<"channels">,
  orgId: string,
  templateName: string,
  templateLanguage: string,
  toPhones: string[],
): Promise<BatchSendResult> {
  const channel = await getOrgWhatsAppChannel(ctx, channelId, orgId);
  const token = resolveAccessToken(channel);
  const phoneNumberId = channel.phoneNumberId!.trim();

  const unique = [...new Set(toPhones.map((p) => p.trim()).filter(Boolean))];
  if (unique.length === 0) {
    throw new Error("No recipients selected.");
  }
  if (unique.length > MAX_BATCH_SEND) {
    throw new Error(
      `At most ${MAX_BATCH_SEND} recipients per batch in this version.`,
    );
  }

  const skipSend = process.env.SKIP_MESSAGE_TEMPLATE_SEND === "true";
  const results: Array<{ phone: string; ok: boolean; error?: string; sentAt: number }> =
    [];
  for (const rawTo of unique) {
    const to = ensureWhatsAppRecipientPhone(rawTo);
    const sentAt = Date.now();
    if (skipSend) {
      results.push({ phone: to, ok: true, sentAt });
      continue;
    }
    try {
      const template = await buildWhatsAppTemplateSendPayload(ctx, {
        orgId,
        channelId,
        templateName,
        templateLanguage,
        toPhone: rawTo,
      });
      const res = await fetch(`${graphBase()}/${phoneNumberId}/messages`, {
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
      await readGraphJson(res);
      results.push({ phone: to, ok: true, sentAt });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({ phone: to, ok: false, error: msg, sentAt });
    }
  }
  const okCount = results.filter((r) => r.ok).length;
  return {
    results,
    okCount,
    failCount: results.length - okCount,
  };
}

function graphBase(): string {
  const version = process.env.META_GRAPH_API_VERSION || DEFAULT_GRAPH_VERSION;
  return `https://graph.facebook.com/${version}`;
}

async function getOrgWhatsAppChannel(
  ctx: ActionCtx,
  channelId: Id<"channels">,
  orgId: string,
): Promise<Doc<"channels">> {
  const channel = await ctx.runQuery(internal.channels.internalGetChannel, {
    channelId,
  });
  if (channel === null || channel.orgId !== orgId) {
    throw new Error("Channel not found");
  }
  if (channel.service !== "whatsapp") {
    throw new Error("Not a WhatsApp channel");
  }
  if (channel.status !== "connected") {
    throw new Error("WhatsApp channel is not connected");
  }
  if (!channel.wabaId?.trim()) {
    throw new Error(
      "WhatsApp Business Account ID is missing for this channel.",
    );
  }
  if (!channel.phoneNumberId?.trim()) {
    throw new Error("Phone number ID is missing for this channel.");
  }
  return channel;
}

function resolveAccessToken(channel: Doc<"channels">): string {
  const token = (channel.accessToken ?? "").trim();
  if (!token) {
    throw new Error("WhatsApp channel has no access token. Reconnect in Channels.");
  }
  return token;
}

async function readGraphJson(res: Response): Promise<unknown> {
  const text = await res.text();
  let body: unknown;
  try {
    body = text.length ? JSON.parse(text) : text;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const formatted =
      typeof body === "string" ? body : JSON.stringify(body, null, 2);
    throw new Error(`Graph API ${res.status}: ${formatted}`);
  }
  return body;
}

export const sendTemplateBatch = action({
  args: {
    channelId: v.id("channels"),
    templateName: v.string(),
    templateLanguage: v.string(),
    toPhones: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const { orgId, userId } = await getAuthContext(ctx);
    const resolvedOrgId = resolveChannelOrgId(orgId, userId);
    return await sendTemplateBatchToPhones(
      ctx,
      args.channelId,
      resolvedOrgId,
      args.templateName,
      args.templateLanguage,
      args.toPhones,
    );
  },
});

export const scheduleTemplateBatch = mutation({
  args: {
    agentId: v.id("agents"),
    channelId: v.id("channels"),
    templateName: v.string(),
    templateLanguage: v.string(),
    customerIds: v.array(v.id("customers")),
    scheduledAt: v.number(),
  },
  handler: async (ctx, args) => {
    const { orgId, userId } = await getAuthContext(ctx);
    const resolvedOrgId = resolveChannelOrgId(orgId, userId);

    await assertAgentInOrg(ctx, args.agentId, orgId, userId);

    const channel = await ctx.db.get(args.channelId);
    if (
      channel === null ||
      channel.orgId !== resolvedOrgId ||
      channel.service !== "whatsapp"
    ) {
      throw new Error("Channel not found");
    }

    const uniqueCustomerIds = [...new Set(args.customerIds)];
    if (uniqueCustomerIds.length === 0) {
      throw new Error("No recipients selected.");
    }

    const isImmediate = args.scheduledAt <= Date.now() + 1000;
    const status = isImmediate ? "processing" : "pending";

    const scheduleId = await ctx.db.insert("whatsappBroadcastSchedules", {
      agentId: args.agentId,
      orgId: resolvedOrgId,
      channelId: args.channelId,
      templateName: args.templateName.trim(),
      templateLanguage: args.templateLanguage.trim(),
      scheduledAt: args.scheduledAt,
      status,
      createdBy: userId,
      createdAt: Date.now(),
      totalCount: uniqueCustomerIds.length,
      okCount: 0,
      failCount: 0,
    });

    for (const customerId of uniqueCustomerIds) {
      const recipientId = await ctx.db.insert("whatsappBroadcastRecipients", {
        scheduleId,
        orgId: resolvedOrgId,
        customerId,
        status: isImmediate ? "processing" : "pending",
      });

      await broadcastPool.enqueueAction(
        ctx,
        internal.broadcastPool.broadcastWorker,
        { recipientId },
        {
          onComplete: internal.broadcastPool.broadcastComplete,
          context: { recipientId },
          runAt: args.scheduledAt,
        }
      );
    }

    return { scheduleId, scheduledAt: args.scheduledAt };
  },
});

export const getBroadcastEstimateUnitUsd = action({
  args: {},
  handler: async (ctx) => {
    await getAuthContext(ctx);
    const raw =
      process.env.WHATSAPP_BROADCAST_ESTIMATE_USD_PER_MESSAGE?.trim();
    const n = raw ? Number.parseFloat(raw) : Number.NaN;
    return {
      unitUsd: Number.isFinite(n) && n >= 0 ? n : 0.015,
    };
  },
});

export const listSchedulesForAgent = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const { orgId, userId } = await getAuthContext(ctx);
    await assertAgentInOrg(ctx, args.agentId, orgId, userId);

    return await ctx.db
      .query("whatsappBroadcastSchedules")
      .withIndex("by_agentId_and_scheduledAt", (q) => q.eq("agentId", args.agentId))
      .order("desc")
      .take(100);
  },
});

export const getBroadcastSchedule = query({
  args: { scheduleId: v.id("whatsappBroadcastSchedules") },
  handler: async (ctx, args) => {
    const { orgId, userId } = await getAuthContext(ctx);
    const resolvedOrgId = resolveChannelOrgId(orgId, userId);

    const schedule = await ctx.db.get(args.scheduleId);
    if (schedule === null || schedule.orgId !== resolvedOrgId) {
      return null;
    }
    await assertAgentInOrg(ctx, schedule.agentId, orgId, userId);
    return schedule;
  },
});

export const listBroadcastScheduleRecipients = query({
  args: { scheduleId: v.id("whatsappBroadcastSchedules") },
  handler: async (ctx, args) => {
    const { orgId, userId } = await getAuthContext(ctx);
    const resolvedOrgId = resolveChannelOrgId(orgId, userId);

    const schedule = await ctx.db.get(args.scheduleId);
    if (schedule === null || schedule.orgId !== resolvedOrgId) {
      return null;
    }
    await assertAgentInOrg(ctx, schedule.agentId, orgId, userId);

    const recipients = await ctx.db
      .query("whatsappBroadcastRecipients")
      .withIndex("by_scheduleId", (q) => q.eq("scheduleId", args.scheduleId))
      .collect();

    const unitMyr = Number(
      process.env.WHATSAPP_BROADCAST_ESTIMATE_MYR_PER_MESSAGE?.trim() ?? "0.3467",
    );
    const rateMyr =
      Number.isFinite(unitMyr) && unitMyr >= 0 ? unitMyr : 0.3467;

    const rows = [];
    for (const rec of recipients) {
      const customer = await ctx.db.get(rec.customerId);
      if (!customer) continue;

      const phone = customer.contactAddress;
      const name = customer.name ?? undefined;
      const sentAt = rec.processedAt ?? schedule.scheduledAt;

      let ok: boolean | undefined = undefined;
      const error: string | undefined = rec.errorMessage;
      let deliveryLabel: string = "Scheduled";

      if (rec.status === "completed") {
        ok = true;
        deliveryLabel = "Delivered";
      } else if (rec.status === "failed") {
        ok = false;
        deliveryLabel = "Failed";
      } else if (rec.status === "processing") {
        deliveryLabel = "Sending";
      } else if (schedule.status === "cancelled") {
        deliveryLabel = "Cancelled";
      }

      const estCostMyr =
        ok === true
          ? rateMyr
          : ok === false || schedule.status === "cancelled"
            ? 0
            : schedule.status === "pending" || schedule.status === "processing"
              ? rateMyr
              : 0;

      rows.push({
        phone,
        name,
        sentAt,
        ok,
        error,
        estCostMyr,
        deliveryLabel,
      });
    }

    rows.sort((a, b) => b.sentAt - a.sentAt);
    return rows;
  },
});

export const cancelScheduledBatch = mutation({
  args: {
    scheduleId: v.id("whatsappBroadcastSchedules"),
  },
  handler: async (ctx, args) => {
    const { orgId, userId } = await getAuthContext(ctx);
    const resolvedOrgId = resolveChannelOrgId(orgId, userId);

    const schedule = await ctx.db.get(args.scheduleId);
    if (schedule === null || schedule.orgId !== resolvedOrgId) {
      throw new Error("Schedule not found");
    }

    if (schedule.status !== "pending") {
      throw new Error(`Cannot cancel a schedule that is already ${schedule.status}`);
    }

    await ctx.db.patch(args.scheduleId, { status: "cancelled", processedAt: Date.now() });

    return { success: true };
  },
});

export const deleteScheduleRecord = mutation({
  args: {
    scheduleId: v.id("whatsappBroadcastSchedules"),
  },
  handler: async (ctx, args) => {
    const { orgId, userId } = await getAuthContext(ctx);
    const resolvedOrgId = resolveChannelOrgId(orgId, userId);

    const schedule = await ctx.db.get(args.scheduleId);
    if (schedule === null || schedule.orgId !== resolvedOrgId) {
      throw new Error("Schedule not found");
    }

    const recipients = await ctx.db
      .query("whatsappBroadcastRecipients")
      .withIndex("by_scheduleId", (q) => q.eq("scheduleId", args.scheduleId))
      .collect();
    for (const rec of recipients) {
      await ctx.db.delete(rec._id);
    }

    await ctx.db.delete(args.scheduleId);
    return { success: true };
  },
});
