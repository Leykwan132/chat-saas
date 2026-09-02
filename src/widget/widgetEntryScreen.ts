export function getWidgetEntryScreen(
  leadFormEnabled: boolean,
  hasVisitorProfile: boolean,
) {
  return leadFormEnabled && !hasVisitorProfile ? "form" : "chat";
}
