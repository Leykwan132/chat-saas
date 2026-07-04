import { v } from "convex/values";
import { WEB_WIDGET_LAYOUTS } from "../shared/webWidgetLayouts";
import { WEB_WIDGET_THEMES } from "../shared/webWidgetThemes";

export const webWidgetLayoutValidator = v.union(
  ...WEB_WIDGET_LAYOUTS.map((layout) => v.literal(layout)),
);

export const webWidgetThemeValidator = v.union(
  ...WEB_WIDGET_THEMES.map((theme) => v.literal(theme)),
);
