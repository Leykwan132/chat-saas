import { v } from "convex/values";
import { WEB_WIDGET_LAYOUTS } from "../shared/webWidgetLayouts";
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

const webWidgetLeadFieldValidator = v.object({
  visible: v.boolean(),
  required: v.boolean(),
});

export const webWidgetHomeValidator = v.object({
  greeting: v.string(),
  introduction: v.string(),
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
});
