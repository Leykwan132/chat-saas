export const WEB_WIDGET_LAYOUTS = [
  "right_avatar",
  "left_avatar",
  "input_bar",
] as const;

export type WebWidgetLayout = (typeof WEB_WIDGET_LAYOUTS)[number];

export const DEFAULT_WEB_WIDGET_LAYOUT: WebWidgetLayout = "right_avatar";

export function normalizeWebWidgetLayout(
  _layout: WebWidgetLayout | undefined,
): WebWidgetLayout {
  return DEFAULT_WEB_WIDGET_LAYOUT;
}
