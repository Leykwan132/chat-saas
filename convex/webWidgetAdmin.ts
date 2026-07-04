import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { getAuthContext, resolveChannelOrgId } from "./authUtils";
import { DEFAULT_WEB_WIDGET_LAYOUT, type WebWidgetLayout } from "../shared/webWidgetLayouts";
import { DEFAULT_WEB_WIDGET_THEME, type WebWidgetTheme } from "../shared/webWidgetThemes";
import { defaultWebWidgetPlaceholder, generateUniquePublicKey, getWebWidgetPlanState, isAgentInAuthScope, normalizeAgentDisplayName, normalizeWidgetPlaceholder, resolveWebWidgetBranding, resolveWidgetIconUrl } from "./webWidgetCore";

type AuthorizedAgent = {
  orgId: string;
  userId: string;
  channelOrgId: string;
  agent: Doc<"agents">;
};

async function getAuthorizedAgent(ctx: QueryCtx | MutationCtx, agentId: Id<"agents">): Promise<AuthorizedAgent> {
  const { orgId, userId } = await getAuthContext(ctx);
  const channelOrgId = resolveChannelOrgId(orgId, userId);
  const agent = await ctx.db.get(agentId);
  if (agent === null || !isAgentInAuthScope(agent, { channelOrgId, userId })) {
    throw new Error("Agent not found");
  }
  return { orgId, userId, channelOrgId, agent };
}

async function getSettingsForAgent(ctx: QueryCtx | MutationCtx, agentId: Id<"agents">) {
  return await ctx.db
    .query("webWidgetSettings")
    .withIndex("by_agentId", (q) => q.eq("agentId", agentId))
    .first();
}

async function widgetDashboardConfig(ctx: QueryCtx | MutationCtx, settings: Doc<"webWidgetSettings">) {
  const planState = await getWebWidgetPlanState(ctx, {
    orgId: settings.orgId,
    userId: settings.connectedByUserId,
  });
  const branding = resolveWebWidgetBranding(settings, planState.canUseCustomIcon);
  return {
    channelId: settings.channelId,
    publicKey: settings.publicKey,
    enabled: settings.enabled,
    agentDisplayName: settings.agentDisplayName,
    placeholder:
      settings.placeholder ?? defaultWebWidgetPlaceholder(settings.agentDisplayName),
    layout: DEFAULT_WEB_WIDGET_LAYOUT,
    theme: DEFAULT_WEB_WIDGET_THEME,
    iconUrl: await resolveWidgetIconUrl(ctx, settings, planState.canUseCustomIcon),
    ...branding,
    canUseCustomIcon: planState.canUseCustomIcon,
  };
}

async function findReusableWebChannel(ctx: MutationCtx, args: { channelOrgId: string; agentId: Id<"agents"> }) {
  const channels = await ctx.db
    .query("channels")
    .withIndex("by_orgId_and_service", (q) =>
      q.eq("orgId", args.channelOrgId).eq("service", "web"),
    )
    .take(100);
  return (
    channels.find(
      (row) =>
        row.defaultAgentId === args.agentId &&
        row.status !== "disconnected",
    ) ?? null
  );
}

async function ensureConnectedWebChannel(
  ctx: MutationCtx,
  args: {
    channelOrgId: string;
    userId: string;
    agentId: Id<"agents">;
    existingSettings: Doc<"webWidgetSettings"> | null;
    now: number;
  },
) {
  let channel: Doc<"channels"> | null = null;
  if (args.existingSettings !== null) {
    channel = await ctx.db.get(args.existingSettings.channelId);
  }
  if (channel === null) {
    channel = await findReusableWebChannel(ctx, args);
  }
  if (channel === null) {
    const channelId = await ctx.db.insert("channels", {
      orgId: args.channelOrgId,
      service: "web",
      status: "connected",
      connectedByUserId: args.userId,
      defaultAgentId: args.agentId,
      createdAt: args.now,
      updatedAt: args.now,
    });
    return await ctx.db.get(channelId);
  }
  if (channel.status === "disconnected") {
    await ctx.db.patch(channel._id, {
      status: "connected",
      defaultAgentId: args.agentId,
      connectedByUserId: args.userId,
      updatedAt: args.now,
    });
    return await ctx.db.get(channel._id);
  }
  return channel;
}

export async function getWidgetForAgent(ctx: QueryCtx, agentId: Id<"agents">) {
  await getAuthorizedAgent(ctx, agentId);
  const settings = await getSettingsForAgent(ctx, agentId);
  if (settings === null) {
    return null;
  }
  return await widgetDashboardConfig(ctx, settings);
}

export async function ensureWidgetForAgent(ctx: MutationCtx, agentId: Id<"agents">) {
  const { userId, channelOrgId, agent } = await getAuthorizedAgent(ctx, agentId);
  const now = Date.now();
  const existingSettings = await getSettingsForAgent(ctx, agentId);
  const channel = await ensureConnectedWebChannel(ctx, {
    channelOrgId,
    userId,
    agentId,
    existingSettings,
    now,
  });
  if (channel === null) {
    throw new Error("Could not create web channel");
  }
  if (existingSettings === null) {
    const settingsId = await ctx.db.insert("webWidgetSettings", {
      channelId: channel._id,
      agentId,
      orgId: channelOrgId,
      connectedByUserId: userId,
      publicKey: await generateUniquePublicKey(ctx),
      enabled: true,
      agentDisplayName: normalizeAgentDisplayName(agent.name),
      layout: DEFAULT_WEB_WIDGET_LAYOUT,
      theme: DEFAULT_WEB_WIDGET_THEME,
      createdAt: now,
      updatedAt: now,
    });
    const settings = await ctx.db.get(settingsId);
    if (settings === null) {
      throw new Error("Could not create widget settings");
    }
    return await widgetDashboardConfig(ctx, settings);
  }
  const patch: Partial<Doc<"webWidgetSettings">> = {
    channelId: channel._id,
    orgId: channelOrgId,
    connectedByUserId: userId,
    enabled: true,
    updatedAt: now,
  };
  if (!existingSettings.agentDisplayName.trim()) {
    patch.agentDisplayName = normalizeAgentDisplayName(agent.name);
  }
  if (existingSettings.layout === undefined) {
    patch.layout = DEFAULT_WEB_WIDGET_LAYOUT;
  }
  if (existingSettings.theme === undefined) {
    patch.theme = DEFAULT_WEB_WIDGET_THEME;
  }
  await ctx.db.patch(existingSettings._id, patch);
  const settings = await ctx.db.get(existingSettings._id);
  if (settings === null) {
    throw new Error("Widget settings not found");
  }
  return await widgetDashboardConfig(ctx, settings);
}

export async function updateWidgetSettings(
  ctx: MutationCtx,
  args: {
    agentId: Id<"agents">;
    agentDisplayName?: string;
    placeholder?: string;
    layout?: WebWidgetLayout;
    theme?: WebWidgetTheme;
    hidePoweredBy?: boolean;
  },
) {
  await getAuthorizedAgent(ctx, args.agentId);
  const settings = await getSettingsForAgent(ctx, args.agentId);
  if (settings === null) {
    throw new Error("Widget settings not found");
  }
  if (args.hidePoweredBy === true) {
    const planState = await getWebWidgetPlanState(ctx, {
      orgId: settings.orgId,
      userId: settings.connectedByUserId,
    });
    if (!planState.canUseCustomIcon) {
      throw new Error("Branding removal is available on paid plans.");
    }
  }
  const patch: Partial<Doc<"webWidgetSettings">> = {
    updatedAt: Date.now(),
  };
  if (args.agentDisplayName !== undefined) {
    patch.agentDisplayName = normalizeAgentDisplayName(args.agentDisplayName);
  }
  if (args.placeholder !== undefined) {
    patch.placeholder = normalizeWidgetPlaceholder(args.placeholder);
  }
  if (args.hidePoweredBy !== undefined) {
    patch.hidePoweredBy = args.hidePoweredBy;
  }
  if (
    patch.agentDisplayName === undefined &&
    patch.placeholder === undefined &&
    patch.hidePoweredBy === undefined
  ) {
    throw new Error("No widget settings changes provided");
  }
  await ctx.db.patch(settings._id, patch);
}

export async function generateWidgetIconUploadUrl(ctx: MutationCtx, agentId: Id<"agents">) {
  const { channelOrgId, userId } = await getAuthorizedAgent(ctx, agentId);
  const planState = await getWebWidgetPlanState(ctx, {
    orgId: channelOrgId,
    userId,
  });
  if (!planState.canUseCustomIcon) {
    throw new Error("Custom widget icons are available on paid plans.");
  }
  return await ctx.storage.generateUploadUrl();
}

export async function saveWidgetIcon(
  ctx: MutationCtx,
  args: { agentId: Id<"agents">; storageId: Id<"_storage"> },
) {
  const { channelOrgId, userId } = await getAuthorizedAgent(ctx, args.agentId);
  const planState = await getWebWidgetPlanState(ctx, {
    orgId: channelOrgId,
    userId,
  });
  if (!planState.canUseCustomIcon) {
    throw new Error("Custom widget icons are available on paid plans.");
  }
  const settings = await getSettingsForAgent(ctx, args.agentId);
  if (settings === null) {
    throw new Error("Widget settings not found");
  }
  await ctx.db.patch(settings._id, {
    iconStorageId: args.storageId,
    updatedAt: Date.now(),
  });
}

export async function removeWidgetIcon(ctx: MutationCtx, agentId: Id<"agents">) {
  await getAuthorizedAgent(ctx, agentId);
  const settings = await getSettingsForAgent(ctx, agentId);
  if (settings === null) {
    throw new Error("Widget settings not found");
  }
  await ctx.db.patch(settings._id, {
    iconStorageId: undefined,
    updatedAt: Date.now(),
  });
}
