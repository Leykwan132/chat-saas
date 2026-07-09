const widgetScriptUrl =
  (import.meta.env.VITE_WIDGET_SCRIPT_URL as string | undefined)?.trim() ||
  'https://kilobot.app/widget/v1.js';

export function buildWebWidgetSnippet(publicKey: string) {
  return `<script
  async
  src="${widgetScriptUrl}"
  data-kilobot-widget="${publicKey}"
></script>`;
}
