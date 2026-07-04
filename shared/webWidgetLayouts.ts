export const WEB_WIDGET_LAYOUTS = [
  "right_avatar",
  "left_avatar",
  "input_bar",
] as const;

export type WebWidgetLayout = (typeof WEB_WIDGET_LAYOUTS)[number];

export const DEFAULT_WEB_WIDGET_LAYOUT: WebWidgetLayout = "input_bar";

export function normalizeWebWidgetLayout(
  layout: WebWidgetLayout | undefined,
): WebWidgetLayout {
  return layout ?? DEFAULT_WEB_WIDGET_LAYOUT;
}
