export const WEB_WIDGET_THEMES = [
  "light",
  "dark",
] as const;

export type WebWidgetTheme = (typeof WEB_WIDGET_THEMES)[number];

export const DEFAULT_WEB_WIDGET_THEME: WebWidgetTheme = "dark";

export function normalizeWebWidgetTheme(
  theme: WebWidgetTheme | undefined,
): WebWidgetTheme {
  return theme ?? DEFAULT_WEB_WIDGET_THEME;
}
