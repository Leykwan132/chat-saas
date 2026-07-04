const widgetScriptUrl =
  (import.meta.env.VITE_WIDGET_SCRIPT_URL as string | undefined)?.trim() ||
  'https://kilobot.app/widget/v1.js';

function widgetApiUrl() {
  const configured = (import.meta.env.VITE_CONVEX_SITE_URL as string | undefined)?.trim();
  return configured || window.location.origin;
}

export function buildWebWidgetSnippet(publicKey: string) {
  return `<script
  async
  src="${widgetScriptUrl}"
  data-kilobot-widget="${publicKey}"
  data-kilobot-api="${widgetApiUrl()}"
></script>`;
}
