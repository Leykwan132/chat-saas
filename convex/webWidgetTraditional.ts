import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { WebWidgetMode } from "../shared/traditionalWebWidget";
import {
  DEFAULT_TRADITIONAL_WIDGET_COLOR,
  DEFAULT_TRADITIONAL_WIDGET_LABEL,
  DEFAULT_WEB_WIDGET_MODE,
  defaultTraditionalWidgetMessage,
  normalizeTraditionalWidgetLabel,
  normalizeTraditionalWidgetMessage,
  traditionalWidgetForeground,
  traditionalWhatsAppUrl,
} from "../shared/traditionalWebWidget";
import {
  getAuthorizedWebWidgetAgent,
  getConnectedWhatsAppForAgent,
  getWebWidgetSettingsForAgent,
} from "./webWidgetAccess";
import { getWebWidgetPlanState } from "./webWidgetCore";

function resolveTraditionalValues(
  settings: Doc<"webWidgetSettings">,
  channel: Doc<"channels"> | null,
) {
  const label = normalizeTraditionalWidgetLabel(
    settings.traditionalLabel ?? DEFAULT_TRADITIONAL_WIDGET_LABEL,
  );
  const prefillMessage = settings.traditionalPrefillMessage ??
    (channel?.displayUsername
      ? defaultTraditionalWidgetMessage(channel.displayUsername)
      : "");
  const mainColor = DEFAULT_TRADITIONAL_WIDGET_COLOR;
  return { label, prefillMessage, mainColor };
}

export async function traditionalDashboardConfig(
  ctx: QueryCtx | MutationCtx,
  settings: Doc<"webWidgetSettings">,
  canUseCustomIcon: boolean,
) {
  const channel = await getConnectedWhatsAppForAgent(ctx, settings.agentId);
  const values = resolveTraditionalValues(settings, channel);
  const hidePoweredBy = canUseCustomIcon && (settings.traditionalHidePoweredBy ?? false);
  return {
    ...values,
    foregroundColor: traditionalWidgetForeground(values.mainColor),
    displayUsername: channel?.displayUsername,
    displayPhoneNumber: channel?.displayPhoneNumber,
    canActivate: Boolean(channel?.displayUsername && channel.displayPhoneNumber),
    canHideBranding: canUseCustomIcon,
    hidePoweredBy,
    poweredBy: !hidePoweredBy,
  };
}

export async function publicTraditionalConfig(
  ctx: QueryCtx,
  settings: Doc<"webWidgetSettings">,
) {
  const channel = await getConnectedWhatsAppForAgent(ctx, settings.agentId);
  if (!channel?.displayUsername || !channel.displayPhoneNumber) {
    throw new Error("Widget not found");
  }
  const plan = await getWebWidgetPlanState(ctx, {
    orgId: settings.orgId,
    userId: settings.connectedByUserId,
  });
  const dashboard = await traditionalDashboardConfig(ctx, settings, plan.canUseCustomIcon);
  const prefillMessage = normalizeTraditionalWidgetMessage(dashboard.prefillMessage);
  return {
    mode: "traditional" as const,
    publicKey: settings.publicKey,
    label: dashboard.label,
    mainColor: dashboard.mainColor,
    foregroundColor: dashboard.foregroundColor,
    poweredBy: dashboard.poweredBy,
    destinationUrl: traditionalWhatsAppUrl(channel.displayPhoneNumber, prefillMessage),
  };
}

export async function updateTraditionalWidgetSettings(
  ctx: MutationCtx,
  args: {
    agentId: Id<"agents">;
    label?: string;
    prefillMessage?: string;
    hidePoweredBy?: boolean;
  },
) {
  await getAuthorizedWebWidgetAgent(ctx, args.agentId);
  const settings = await getWebWidgetSettingsForAgent(ctx, args.agentId);
  if (settings === null) throw new Error("Widget settings not found");
  if (args.hidePoweredBy === true) {
    const plan = await getWebWidgetPlanState(ctx, {
      orgId: settings.orgId,
      userId: settings.connectedByUserId,
    });
    if (!plan.canUseCustomIcon) {
      throw new Error("Branding removal is available on paid plans.");
    }
  }
  const patch: Partial<Doc<"webWidgetSettings">> = { updatedAt: Date.now() };
  if (args.label !== undefined) patch.traditionalLabel = normalizeTraditionalWidgetLabel(args.label);
  if (args.prefillMessage !== undefined) patch.traditionalPrefillMessage = normalizeTraditionalWidgetMessage(args.prefillMessage);
  if (args.hidePoweredBy !== undefined) patch.traditionalHidePoweredBy = args.hidePoweredBy;
  if (Object.keys(patch).length === 1) throw new Error("No Traditional settings changes provided");
  await ctx.db.patch(settings._id, patch);
}

export async function activateWebWidgetMode(
  ctx: MutationCtx,
  args: { agentId: Id<"agents">; mode: WebWidgetMode },
) {
  await getAuthorizedWebWidgetAgent(ctx, args.agentId);
  const settings = await getWebWidgetSettingsForAgent(ctx, args.agentId);
  if (settings === null) throw new Error("Widget settings not found");
  if (args.mode === DEFAULT_WEB_WIDGET_MODE) {
    await ctx.db.patch(settings._id, { mode: args.mode, updatedAt: Date.now() });
    return;
  }
  const channel = await getConnectedWhatsAppForAgent(ctx, args.agentId);
  if (!channel?.displayUsername || !channel.displayPhoneNumber) {
    throw new Error("Connect WhatsApp before activating Traditional");
  }
  const values = resolveTraditionalValues(settings, channel);
  await ctx.db.patch(settings._id, {
    mode: args.mode,
    traditionalLabel: values.label,
    traditionalPrefillMessage: normalizeTraditionalWidgetMessage(values.prefillMessage),
    updatedAt: Date.now(),
  });
}

export async function saveTraditionalWidgetIcon(
  ctx: MutationCtx,
  args: { agentId: Id<"agents">; storageId: Id<"_storage"> },
) {
  const { channelOrgId, userId } = await getAuthorizedWebWidgetAgent(ctx, args.agentId);
  const plan = await getWebWidgetPlanState(ctx, { orgId: channelOrgId, userId });
  if (!plan.canUseCustomIcon) {
    throw new Error("Custom widget icons are available on paid plans.");
  }
  const metadata = await ctx.db.system.get("_storage", args.storageId);
  if (
    metadata === null ||
    metadata.size > 1_000_000 ||
    !["image/png", "image/jpeg", "image/webp"].includes(metadata.contentType ?? "")
  ) {
    throw new Error("Traditional icons must be a PNG, JPEG, or WebP under 1 MB.");
  }
  const settings = await getWebWidgetSettingsForAgent(ctx, args.agentId);
  if (settings === null) throw new Error("Widget settings not found");
  await ctx.db.patch(settings._id, {
    traditionalIconStorageId: args.storageId,
    updatedAt: Date.now(),
  });
}

export async function removeTraditionalWidgetIcon(
  ctx: MutationCtx,
  agentId: Id<"agents">,
) {
  await getAuthorizedWebWidgetAgent(ctx, agentId);
  const settings = await getWebWidgetSettingsForAgent(ctx, agentId);
  if (settings === null) throw new Error("Widget settings not found");
  await ctx.db.patch(settings._id, {
    traditionalIconStorageId: undefined,
    updatedAt: Date.now(),
  });
}
