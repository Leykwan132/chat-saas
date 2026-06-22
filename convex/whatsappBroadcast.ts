import { v } from "convex/values";
import {
  action,
  mutation,
  query,
  type ActionCtx,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { getAuthContext, PERSONAL_ORG_FALLBACK, resolveChannelOrgId } from "./authUtils";
import { broadcastPool } from "./broadcastPool";

const WHATSAPP_DEMO_ACCESS_SENTINEL = "__whatsapp_demo__";
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
  for (const to of unique) {
    const sentAt = Date.now();
    if (skipSend) {
      results.push({ phone: to, ok: true, sentAt });
      continue;
    }
    try {
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
          template: {
            name: templateName.trim(),
            language: { code: templateLanguage.trim() },
          },
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
  const isDemo = channel.accessToken === WHATSAPP_DEMO_ACCESS_SENTINEL;
  const token = isDemo
    ? (process.env.WHATSAPP_DEMO_ACCESS_TOKEN ?? "").trim()
    : (channel.accessToken ?? "").trim();
  if (!token) {
    throw new Error(
      isDemo
        ? "Set WHATSAPP_DEMO_ACCESS_TOKEN on your Convex deployment to use the demo WhatsApp channel."
        : "WhatsApp channel has no access token. Reconnect in Channels.",
    );
  }
  return token;
}

async function readGraphJson(res: Response): Promise<unknown> {
  const text = await res.text();
  let body: unknown = text;
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

type MetaTemplateRow = {
  name?: string;
  language?: string | { code?: string };
  status?: string;
  category?: string;
  components?: Array<{ type: string; text?: string }>;
};

function normalizeLanguage(lang: MetaTemplateRow["language"]): string {
  if (typeof lang === "string" && lang.trim()) return lang.trim();
  if (lang && typeof lang === "object" && typeof lang.code === "string") {
    return lang.code.trim();
  }
  return "";
}

export const listTemplates = action({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const { orgId, userId } = await getAuthContext(ctx);
    const resolvedOrgId = resolveChannelOrgId(orgId, userId);
    const channel = await getOrgWhatsAppChannel(ctx, args.channelId, resolvedOrgId);
    const token = resolveAccessToken(channel);
    const wabaId = channel.wabaId!.trim();

    // 1. Fetch remote templates from Meta
    let rows: MetaTemplateRow[] = [];
    try {
      const res = await fetch(
        `${graphBase()}/${wabaId}/message_templates?fields=name,status,language,category,components&limit=200`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const body = (await readGraphJson(res)) as { data?: MetaTemplateRow[] };
      rows = body.data ?? [];
    } catch (e) {
      console.error("Failed to list templates from Meta:", e);
    }

    const remoteTemplates = rows
      .map((r) => ({
        name: (r.name ?? "").trim(),
        language: normalizeLanguage(r.language),
        status: r.status ?? "UNKNOWN",
        category: r.category ?? "",
        components: r.components ?? [],
      }))
      .filter((r) => r.name.length > 0 && r.language.length > 0);

    // 2. Query local templates for this channel
    const localTemplates = await ctx.runQuery(api.whatsappTemplates.listLocalTemplates, {
      channelId: args.channelId,
    });

    const finalTemplates: typeof remoteTemplates = [...remoteTemplates];

    for (const local of localTemplates) {
      const match = remoteTemplates.find(
        (r) => r.name === local.name && r.language === local.language
      );
      if (match) {
        // Safe-heal: template is now on Meta, so clean up local record
        await ctx.runMutation(internal.whatsappTemplates.deleteLocalTemplate, {
          templateId: local._id,
        });
      } else {
        // Not on Meta yet (or failed, or submitting)
        let statusString = "SUBMITTING";
        if (local.status === "failed") {
          statusString = "SUBMISSION_FAILED";
        }
        
        // Add to list so user can see it
        finalTemplates.push({
          name: local.name,
          language: local.language,
          status: statusString,
          category: local.category,
          components: local.components,
          // Attach error if it exists
          ...((local as any).error ? { error: (local as any).error } : {}),
        });
      }
    }

    return { templates: finalTemplates };
  },
});

export const createTemplate = action({
  args: {
    channelId: v.id("channels"),
    name: v.string(),
    language: v.string(),
    category: v.string(),
    bodyText: v.string(),
  },
  handler: async (ctx, args) => {
    const { orgId, userId } = await getAuthContext(ctx);
    const resolvedOrgId = resolveChannelOrgId(orgId, userId);
    const channel = await getOrgWhatsAppChannel(ctx, args.channelId, resolvedOrgId);
    const token = resolveAccessToken(channel);
    const wabaId = channel.wabaId!.trim();
    const res = await fetch(`${graphBase()}/${wabaId}/message_templates`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: args.name.trim(),
        category: args.category.trim() || "UTILITY",
        language: args.language.trim(),
        components: [{ type: "BODY", text: args.bodyText.trim() }],
      }),
    });
    await readGraphJson(res);
    return { ok: true as const };
  },
});

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
      let error: string | undefined = rec.errorMessage;
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
