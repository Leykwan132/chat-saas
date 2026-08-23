import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { deleteConversationAgentThread } from "./channelAgentThreadCleanup";
import { getTeamStripePlanHelper } from "./plans";
import { normalizeWebWidgetLayout } from "../shared/webWidgetLayouts";
import { normalizeWebWidgetTheme } from "../shared/webWidgetThemes";
import { normalizeWebWidgetExperience } from "../shared/webWidgetExperience";
import {
  normalizeWebWidgetSuggestions,
  resolveWebWidgetSuggestionsEnabled,
} from "../shared/webWidgetSuggestions";
import { canProcessWorkspaceActivity } from "./teamDeletion/access";
import {
  DEFAULT_WEB_WIDGET_MODE,
  type WebWidgetMode,
} from "../shared/traditionalWebWidget";
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
  mode: WebWidgetMode = DEFAULT_WEB_WIDGET_MODE,
) {
  if (!settings.enabled) {
    throw new Error("Widget not found");
  }
  if (mode === "traditional") {
    return await publicTraditionalConfig(ctx, settings);
  }
  const planState = await getWebWidgetPlanState(ctx, {
    orgId: settings.orgId,
    userId: settings.connectedByUserId,
  });
  const branding = resolveWebWidgetBranding(
    settings,
    planState.canUseCustomIcon,
  );
  const iconUrl = await resolveWidgetIconUrl(ctx, settings, true);
  const team = await ctx.db
    .query("teams")
    .withIndex("by_workosOrgId", (q) => q.eq("workosOrgId", settings.orgId))
    .unique();
  const experience = normalizeWebWidgetExperience(settings);
  return {
    mode: "ai_powered" as const,
    publicKey: settings.publicKey,
    agentDisplayName: settings.agentDisplayName,
    teamName: team?.name ?? "Team",
    layout: normalizeWebWidgetLayout(settings.layout),
    theme: normalizeWebWidgetTheme(settings.theme),
    placeholder:
      settings.placeholder ??
      defaultWebWidgetPlaceholder(settings.agentDisplayName),
    suggestions: normalizeWebWidgetSuggestions(settings.suggestions),
    suggestionsEnabled: resolveWebWidgetSuggestionsEnabled(
      settings.suggestionsEnabled,
      settings.suggestions,
    ),
    iconUrl,
    poweredBy: branding.poweredBy,
    ...experience,
  };
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
  const conversation = await ctx.db
    .query("conversations")
    .withIndex("by_channel_and_contactAddress", (q) =>
      q
        .eq("channelId", settings.channelId)
        .eq("contactAddress", args.visitorId),
    )
    .order("desc")
    .first();
  if (conversation === null || conversation.status === "closed") {
    return [];
  }
  const messages = await ctx.db
    .query("messages")
    .withIndex("by_conversationId_and_createdAt", (q) =>
      q.eq("conversationId", conversation._id),
    )
    .order("desc")
    .take(RECENT_WIDGET_MESSAGES);
  const authorUserIds = [
    ...new Set(
      messages.flatMap((message) =>
        message.authorUserId === undefined ? [] : [message.authorUserId],
      ),
    ),
  ];
  const teamMemberNames = new Map(
    await Promise.all(
      authorUserIds.map(async (authorUserId) => {
        const user = await ctx.db
          .query("users")
          .withIndex("by_workosUserId", (q) =>
            q.eq("workosUserId", authorUserId),
          )
          .unique();
        const senderName = [user?.firstName, user?.lastName]
          .filter(Boolean)
          .join(" ")
          .trim();
        return [authorUserId, senderName || undefined] as const;
      }),
    ),
  );
  return messages.reverse().map((message) => ({
    id: message._id,
    direction: message.direction,
    sender:
      message.direction === "incoming"
        ? "visitor"
        : message.authorUserId === undefined
          ? "ai"
          : "team",
    senderName:
      message.authorUserId === undefined
        ? undefined
        : teamMemberNames.get(message.authorUserId),
    contentType: message.contentType,
    content: message.content,
    mediaUrl: message.mediaUrl,
    createdAt: message.createdAt,
  }));
}

export async function resetWidgetConversation(
  ctx: MutationCtx,
  args: { publicKey: string; visitorId: string },
) {
  const settings = await getEnabledSettingsByPublicKey(ctx, args.publicKey);
  const conversation = await ctx.db
    .query("conversations")
    .withIndex("by_channel_and_contactAddress", (q) =>
      q
        .eq("channelId", settings.channelId)
        .eq("contactAddress", args.visitorId),
    )
    .order("desc")
    .first();
  if (conversation === null || conversation.status === "closed") {
    return null;
  }
  await deleteConversationAgentThread(ctx, conversation.threadId);
  await ctx.db.patch(conversation._id, {
    status: "closed",
    assignToAiAgent: false,
    unreadCount: 0,
    updatedAt: Date.now(),
  });
  return null;
}
