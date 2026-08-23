import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { normalizeWebWidgetLayout } from "../shared/webWidgetLayouts";
import { normalizeWebWidgetTheme } from "../shared/webWidgetThemes";
import { normalizeWebWidgetExperience } from "../shared/webWidgetExperience";
import {
  normalizeWebWidgetSuggestions,
  resolveWebWidgetSuggestionsEnabled,
} from "../shared/webWidgetSuggestions";
import {
  defaultWebWidgetPlaceholder,
  getWebWidgetPlanState,
  resolveWebWidgetBranding,
  resolveWidgetIconUrl,
} from "./webWidgetCore";
import { traditionalDashboardConfig } from "./webWidgetTraditional";

export async function widgetDashboardConfig(
  ctx: QueryCtx | MutationCtx,
  settings: Doc<"webWidgetSettings">,
) {
  const planState = await getWebWidgetPlanState(ctx, {
    orgId: settings.orgId,
    userId: settings.connectedByUserId,
  });
  const branding = resolveWebWidgetBranding(
    settings,
    planState.canUseCustomIcon,
  );
  return {
    channelId: settings.channelId,
    publicKey: settings.publicKey,
    enabled: settings.enabled,
    agentDisplayName: settings.agentDisplayName,
    placeholder:
      settings.placeholder ??
      defaultWebWidgetPlaceholder(settings.agentDisplayName),
    layout: normalizeWebWidgetLayout(settings.layout),
    theme: normalizeWebWidgetTheme(settings.theme),
    suggestions: normalizeWebWidgetSuggestions(settings.suggestions),
    suggestionsEnabled: resolveWebWidgetSuggestionsEnabled(
      settings.suggestionsEnabled,
      settings.suggestions,
    ),
    iconUrl: await resolveWidgetIconUrl(ctx, settings, true),
    ...branding,
    canUseCustomIcon: true,
    ...normalizeWebWidgetExperience(settings),
    traditional: await traditionalDashboardConfig(
      ctx,
      settings,
      planState.canUseCustomIcon,
    ),
  };
}
