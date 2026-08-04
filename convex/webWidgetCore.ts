import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { getTeamStripePlanHelper } from "./plans";
import { normalizeWebWidgetLayout } from "../shared/webWidgetLayouts";
import { DEFAULT_WEB_WIDGET_THEME } from "../shared/webWidgetThemes";
import { canProcessWorkspaceActivity } from "./teamDeletion/access";
import { DEFAULT_WEB_WIDGET_MODE } from "../shared/traditionalWebWidget";
import { publicTraditionalConfig } from "./webWidgetTraditional";

export const RECENT_WIDGET_MESSAGES = 80;

const PUBLIC_KEY_PREFIX = "pub_";

function randomPublicKey() {
  return `${PUBLIC_KEY_PREFIX}${crypto.randomUUID().replaceAll("-", "")}`;
}

export async function generateUniquePublicKey(ctx: QueryCtx | MutationCtx) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const publicKey = randomPublicKey();
    const existing = await ctx.db
      .query("webWidgetSettings")
      .withIndex("by_publicKey", (q) => q.eq("publicKey", publicKey))
      .unique();
    if (existing === null) {
      return publicKey;
    }
  }
  throw new Error("Could not generate widget key");
}

export function normalizeAgentDisplayName(name: string) {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    throw new Error("Agent name is required");
  }
  if (trimmed.length > 80) {
    throw new Error("Agent name must be 80 characters or fewer");
  }
  return trimmed;
}

export function defaultWebWidgetPlaceholder(agentDisplayName: string) {
  return `What can ${agentDisplayName} help with?`;
}

export function normalizeWidgetPlaceholder(placeholder: string) {
  const trimmed = placeholder.trim();
  if (trimmed.length === 0) {
    throw new Error("Placeholder is required");
  }
  if (trimmed.length > 120) {
    throw new Error("Placeholder must be 120 characters or fewer");
  }
  return trimmed;
}

export function isAgentInAuthScope(
  agent: Doc<"agents">,
  args: { channelOrgId: string; userId: string },
) {
  if (args.channelOrgId) {
    return agent.orgId === args.channelOrgId;
  }
  return agent.orgId === "" && agent.userId === args.userId;
}

export async function getWebWidgetPlanState(
  ctx: QueryCtx | MutationCtx,
  args: { orgId: string; userId: string },
) {
  const stripeInfo = await getTeamStripePlanHelper(ctx, {
    workosOrgId: args.orgId,
    userId: args.userId,
  });
  return {
    plan: stripeInfo.plan,
    canUseCustomIcon: stripeInfo.plan !== "free",
  };
}

export async function resolveWidgetIconUrl(
  ctx: QueryCtx | MutationCtx,
  settings: Doc<"webWidgetSettings">,
  canUseCustomIcon: boolean,
) {
  if (!canUseCustomIcon || settings.iconStorageId === undefined) {
    return undefined;
  }
  return (await ctx.storage.getUrl(settings.iconStorageId)) ?? undefined;
}

export function resolveWebWidgetBranding(
  settings: Pick<Doc<"webWidgetSettings">, "hidePoweredBy">,
  canHideBranding: boolean,
) {
  const hidePoweredBy = canHideBranding && (settings.hidePoweredBy ?? true);
  return {
    canHideBranding,
    hidePoweredBy,
    poweredBy: !hidePoweredBy,
  };
}

export async function publicConfigForSettings(
  ctx: QueryCtx,
  settings: Doc<"webWidgetSettings">,
) {
  if (!settings.enabled) {
    throw new Error("Widget not found");
  }
  if ((settings.mode ?? DEFAULT_WEB_WIDGET_MODE) === "traditional") {
    return await publicTraditionalConfig(ctx, settings);
  }
  const planState = await getWebWidgetPlanState(ctx, {
    orgId: settings.orgId,
    userId: settings.connectedByUserId,
  });
  const branding = resolveWebWidgetBranding(settings, planState.canUseCustomIcon);
  const iconUrl = await resolveWidgetIconUrl(ctx, settings, planState.canUseCustomIcon);
  return {
    mode: "ai_powered" as const,
    publicKey: settings.publicKey,
    agentDisplayName: settings.agentDisplayName,
    layout: normalizeWebWidgetLayout(settings.layout),
    theme: DEFAULT_WEB_WIDGET_THEME,
    placeholder:
      settings.placeholder ?? defaultWebWidgetPlaceholder(settings.agentDisplayName),
    iconUrl,
    poweredBy: branding.poweredBy,
  };
}

export function assertAiWebWidget(settings: Doc<"webWidgetSettings">) {
  if ((settings.mode ?? DEFAULT_WEB_WIDGET_MODE) === "traditional") {
    throw new Error("AI messaging is unavailable for Traditional widgets");
  }
}

export async function getEnabledSettingsByPublicKey(
  ctx: QueryCtx | MutationCtx,
  publicKey: string,
) {
  const settings = await ctx.db
    .query("webWidgetSettings")
    .withIndex("by_publicKey", (q) => q.eq("publicKey", publicKey))
    .unique();
  if (
    settings === null ||
    !settings.enabled ||
    !(await canProcessWorkspaceActivity(ctx, settings.orgId))
  ) {
    throw new Error("Widget not found");
  }
  return settings;
}

export async function listMessagesForVisitor(
  ctx: QueryCtx,
  args: { publicKey: string; visitorId: string },
) {
  const settings = await getEnabledSettingsByPublicKey(ctx, args.publicKey);
  assertAiWebWidget(settings);
  const conversation = await ctx.db
    .query("conversations")
    .withIndex("by_channel_and_contactAddress", (q) =>
      q.eq("channelId", settings.channelId).eq("contactAddress", args.visitorId),
    )
    .unique();
  if (conversation === null) {
    return [];
  }
  const messages = await ctx.db
    .query("messages")
    .withIndex("by_conversationId_and_createdAt", (q) =>
      q.eq("conversationId", conversation._id),
    )
    .order("desc")
    .take(RECENT_WIDGET_MESSAGES);
  return messages.reverse().map((message) => ({
    id: message._id,
    direction: message.direction,
    contentType: message.contentType,
    content: message.content,
    mediaUrl: message.mediaUrl,
    createdAt: message.createdAt,
  }));
}
