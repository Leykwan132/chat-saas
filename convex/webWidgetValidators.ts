import { v } from "convex/values";
import { WEB_WIDGET_LAYOUTS } from "../shared/webWidgetLayouts";
import { WEB_WIDGET_CUSTOM_LEAD_FIELD_TYPES } from "../shared/webWidgetExperience";
import { WEB_WIDGET_THEMES } from "../shared/webWidgetThemes";
import { WEB_WIDGET_MODES } from "../shared/traditionalWebWidget";

export const webWidgetModeValidator = v.union(
  ...WEB_WIDGET_MODES.map((mode) => v.literal(mode)),
);

export const webWidgetLayoutValidator = v.union(
  ...WEB_WIDGET_LAYOUTS.map((layout) => v.literal(layout)),
);

export const webWidgetThemeValidator = v.union(
  ...WEB_WIDGET_THEMES.map((theme) => v.literal(theme)),
);

export const webWidgetSuggestionsValidator = v.array(v.string());

const webWidgetLeadFieldValidator = v.object({
  visible: v.boolean(),
  required: v.boolean(),
});

const webWidgetCustomLeadFieldValidator = v.object({
  id: v.string(),
  label: v.string(),
  type: v.union(
    ...WEB_WIDGET_CUSTOM_LEAD_FIELD_TYPES.map((type) => v.literal(type)),
  ),
  options: v.array(v.string()),
  required: v.optional(v.boolean()),
});

export const webWidgetHomeValidator = v.object({
  greeting: v.string(),
  introduction: v.string(),
  initialMessage: v.optional(v.string()),
  availabilityText: v.string(),
  replyTimeText: v.string(),
});

export const webWidgetLeadFormValidator = v.object({
  enabled: v.boolean(),
  heading: v.string(),
  description: v.string(),
  submitLabel: v.string(),
  fields: v.object({
    name: webWidgetLeadFieldValidator,
    email: webWidgetLeadFieldValidator,
    phone: webWidgetLeadFieldValidator,
  }),
  customFields: v.optional(v.array(webWidgetCustomLeadFieldValidator)),
});
