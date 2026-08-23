import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import {
  DEFAULT_WEB_WIDGET_LAYOUT,
  normalizeWebWidgetLayout,
  type WebWidgetLayout,
} from "../shared/webWidgetLayouts";
import {
  DEFAULT_WEB_WIDGET_THEME,
  type WebWidgetTheme,
} from "../shared/webWidgetThemes";
import {
  normalizeWebWidgetExperience,
  isWebWidgetLeadFormValid,
  type WebWidgetHome,
  type WebWidgetLeadFormInput,
} from "../shared/webWidgetExperience";
import { normalizeWebWidgetSuggestions } from "../shared/webWidgetSuggestions";
import {
  generateUniquePublicKey,
  getWebWidgetPlanState,
  normalizeAgentDisplayName,
  normalizeWidgetPlaceholder,
} from "./webWidgetCore";
import {
  getAuthorizedWebWidgetAgent,
  getWebWidgetSettingsForAgent,
} from "./webWidgetAccess";
import { widgetDashboardConfig } from "./webWidgetDashboardConfig";

async function findReusableWebChannel(
  ctx: MutationCtx,
  args: { channelOrgId: string; agentId: Id<"agents"> },
) {
  const channels = await ctx.db
    .query("channels")
    .withIndex("by_orgId_and_service", (q) =>
      q.eq("orgId", args.channelOrgId).eq("service", "web"),
    )
    .take(100);
  return (
    channels.find(
      (row) =>
        row.defaultAgentId === args.agentId && row.status !== "disconnected",
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
  await getAuthorizedWebWidgetAgent(ctx, agentId);
  const settings = await getWebWidgetSettingsForAgent(ctx, agentId);
  if (settings === null) {
    return null;
  }
  return await widgetDashboardConfig(ctx, settings);
}

export async function ensureWidgetForAgent(
  ctx: MutationCtx,
  agentId: Id<"agents">,
) {
  const { userId, channelOrgId, agent } = await getAuthorizedWebWidgetAgent(
    ctx,
    agentId,
  );
  const now = Date.now();
  const existingSettings = await getWebWidgetSettingsForAgent(ctx, agentId);
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
      suggestionsEnabled: false,
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
    suggestions?: readonly string[];
    suggestionsEnabled?: boolean;
    layout?: WebWidgetLayout;
    theme?: WebWidgetTheme;
    home?: Partial<WebWidgetHome>;
    leadForm?: WebWidgetLeadFormInput;
    hidePoweredBy?: boolean;
  },
) {
  await getAuthorizedWebWidgetAgent(ctx, args.agentId);
  const settings = await getWebWidgetSettingsForAgent(ctx, args.agentId);
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
  if (args.suggestions !== undefined) {
    patch.suggestions = normalizeWebWidgetSuggestions(args.suggestions);
  }
  if (args.suggestionsEnabled !== undefined) {
    patch.suggestionsEnabled = args.suggestionsEnabled;
  }
  if (args.hidePoweredBy !== undefined) {
    patch.hidePoweredBy = args.hidePoweredBy;
  }
  if (args.layout !== undefined) {
    patch.layout = normalizeWebWidgetLayout(args.layout);
  }
  if (args.theme !== undefined) {
    patch.theme = args.theme;
  }
  if (args.home !== undefined) {
    patch.home = normalizeWebWidgetExperience({ home: args.home }).home;
  }
  if (args.leadForm !== undefined) {
    const leadForm = normalizeWebWidgetExperience({
      leadForm: args.leadForm,
    }).leadForm;
    if (!isWebWidgetLeadFormValid(leadForm)) {
      throw new Error("Visitor form needs at least one visible field");
    }
    patch.leadForm = leadForm;
  }
  if (
    patch.agentDisplayName === undefined &&
    patch.placeholder === undefined &&
    patch.suggestions === undefined &&
    patch.suggestionsEnabled === undefined &&
    patch.hidePoweredBy === undefined &&
    patch.layout === undefined &&
    patch.theme === undefined &&
    patch.home === undefined &&
    patch.leadForm === undefined
  ) {
    throw new Error("No widget settings changes provided");
  }
  await ctx.db.patch(settings._id, patch);
}

export async function generateWidgetIconUploadUrl(
  ctx: MutationCtx,
  agentId: Id<"agents">,
) {
  await getAuthorizedWebWidgetAgent(ctx, agentId);
  return await ctx.storage.generateUploadUrl();
}

export async function saveWidgetIcon(
  ctx: MutationCtx,
  args: { agentId: Id<"agents">; storageId: Id<"_storage"> },
) {
  await getAuthorizedWebWidgetAgent(ctx, args.agentId);
  const settings = await getWebWidgetSettingsForAgent(ctx, args.agentId);
  if (settings === null) {
    throw new Error("Widget settings not found");
  }
  await ctx.db.patch(settings._id, {
    iconStorageId: args.storageId,
    updatedAt: Date.now(),
  });
}

export async function removeWidgetIcon(
  ctx: MutationCtx,
  agentId: Id<"agents">,
) {
  await getAuthorizedWebWidgetAgent(ctx, agentId);
  const settings = await getWebWidgetSettingsForAgent(ctx, agentId);
  if (settings === null) {
    throw new Error("Widget settings not found");
  }
  await ctx.db.patch(settings._id, {
    iconStorageId: undefined,
    updatedAt: Date.now(),
  });
}
