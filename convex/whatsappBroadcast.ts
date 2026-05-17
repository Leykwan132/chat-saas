import { v } from "convex/values";
import { action, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { getAuthContext } from "./authUtils";

const WHATSAPP_DEMO_ACCESS_SENTINEL = "__whatsapp_demo__";
const DEFAULT_GRAPH_VERSION = "v22.0";
const MAX_BATCH_SEND = 50;

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
    const { orgId } = await getAuthContext(ctx);
    if (!orgId || orgId === "personal") {
      throw new Error("You must belong to an organization.");
    }
    const channel = await getOrgWhatsAppChannel(ctx, args.channelId, orgId);
    const token = resolveAccessToken(channel);
    const wabaId = channel.wabaId!.trim();
    const res = await fetch(
      `${graphBase()}/${wabaId}/message_templates?fields=name,status,language,category&limit=200`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const body = (await readGraphJson(res)) as { data?: MetaTemplateRow[] };
    const rows = body.data ?? [];
    return {
      templates: rows
        .map((r) => ({
          name: (r.name ?? "").trim(),
          language: normalizeLanguage(r.language),
          status: r.status ?? "UNKNOWN",
          category: r.category ?? "",
        }))
        .filter((r) => r.name.length > 0 && r.language.length > 0),
    };
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
    const { orgId } = await getAuthContext(ctx);
    if (!orgId || orgId === "personal") {
      throw new Error("You must belong to an organization.");
    }
    const channel = await getOrgWhatsAppChannel(ctx, args.channelId, orgId);
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
    const { orgId } = await getAuthContext(ctx);
    if (!orgId || orgId === "personal") {
      throw new Error("You must belong to an organization.");
    }
    const channel = await getOrgWhatsAppChannel(ctx, args.channelId, orgId);
    const token = resolveAccessToken(channel);
    const phoneNumberId = channel.phoneNumberId!.trim();

    const unique = [
      ...new Set(args.toPhones.map((p) => p.trim()).filter(Boolean)),
    ];
    if (unique.length === 0) {
      throw new Error("No recipients selected.");
    }
    if (unique.length > MAX_BATCH_SEND) {
      throw new Error(
        `At most ${MAX_BATCH_SEND} recipients per batch in this version.`,
      );
    }

    const results: Array<{ phone: string; ok: boolean; error?: string }> = [];
    for (const to of unique) {
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
              name: args.templateName.trim(),
              language: { code: args.templateLanguage.trim() },
            },
          }),
        });
        await readGraphJson(res);
        results.push({ phone: to, ok: true });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        results.push({ phone: to, ok: false, error: msg });
      }
    }
    const okCount = results.filter((r) => r.ok).length;
    return {
      results,
      okCount,
      failCount: results.length - okCount,
    };
  },
});

/** Indicative unit for UI only; not Meta’s invoice. */
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
