import type { WebWidgetMode } from '../../../shared/traditionalWebWidget';

const widgetScriptUrl =
  (import.meta.env.VITE_WIDGET_SCRIPT_URL as string | undefined)?.trim() ||
  'https://kilobot.app/widget/v1.js';

export function buildWebWidgetSnippet(publicKey: string, mode: WebWidgetMode) {
  const installationMode = mode === 'ai_powered' ? 'ai-powered' : 'traditional';
  return `<script
  async
  src="${widgetScriptUrl}"
  data-kilobot-widget="${publicKey}"
  data-kilobot-mode="${installationMode}"
></script>`;
}
