import { v } from "convex/values";
import { action, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { getAuthContext, resolveChannelOrgId } from "./authUtils";

const DEFAULT_GRAPH_VERSION = "v25.0";
const META_MESSAGING_LIMIT_DOCS_URL =
  "https://developers.facebook.com/documentation/business-messaging/whatsapp/messaging-limits#scaling-paths";

export type MessagingLimitDescription = {
  tier: string;
  displayLabel: string;
  conversationLimit: number | null;
};

function parseMessagingLimitTier(tier: string): number | null {
  const match = /^TIER_(\d+(?:\.\d+)?)([KM])?$/i.exec(tier);
  if (match === null) return null;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) return null;
  const suffix = match[2]?.toUpperCase();
  const multiplier = suffix === "M" ? 1_000_000 : suffix === "K" ? 1_000 : 1;
  return Math.round(amount * multiplier);
}

export function describeMessagingLimitTier(tierValue: string): MessagingLimitDescription {
  const tier = tierValue.trim() || "UNKNOWN";
  const conversationLimit = parseMessagingLimitTier(tier);
  return {
    tier,
    displayLabel:
      conversationLimit === null
        ? "Unknown"
        : new Intl.NumberFormat("en-US").format(conversationLimit),
    conversationLimit,
  };
}

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

async function getMessagingLimitChannel(
  ctx: ActionCtx,
  channelId: Id<"channels">,
  orgId: string,
): Promise<Doc<"channels">> {
  const channel: Doc<"channels"> | null = await ctx.runQuery(
    internal.channels.internalGetChannel,
    { channelId },
  );
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
    throw new Error("WhatsApp Business Account ID is missing for this channel.");
  }
  return channel;
}

export const getMessagingLimit = action({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const { orgId, userId } = await getAuthContext(ctx);
    const channelOrgId = resolveChannelOrgId(orgId, userId);
    const channel = await getMessagingLimitChannel(ctx, args.channelId, channelOrgId);
    const token = resolveAccessToken(channel);
    const wabaId = channel.wabaId!.trim();
    const res = await fetch(
      `${graphBase()}/${wabaId}?fields=whatsapp_business_manager_messaging_limit`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const body = (await readGraphJson(res)) as {
      whatsapp_business_manager_messaging_limit?: unknown;
      id?: unknown;
    };
    const description = describeMessagingLimitTier(
      typeof body.whatsapp_business_manager_messaging_limit === "string"
        ? body.whatsapp_business_manager_messaging_limit
        : "UNKNOWN",
    );

    return {
      ...description,
      wabaId: typeof body.id === "string" ? body.id : wabaId,
      docsUrl: META_MESSAGING_LIMIT_DOCS_URL,
      fetchedAt: Date.now(),
    };
  },
});
