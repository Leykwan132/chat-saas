import type { WebWidgetMode } from '../../../shared/traditionalWebWidget';
import { isNativeHost } from '@/lib/hostBranding';

const widgetScriptUrl =
  (import.meta.env.VITE_WIDGET_SCRIPT_URL as string | undefined)?.trim() ||
  'https://kilobot.app/widget/v1.js';

type WidgetScriptLocation = {
  hostname: string;
  origin: string;
};

function getBrowserLocation(): WidgetScriptLocation | undefined {
  if (typeof window === 'undefined' || !window.location) return undefined;
  return {
    hostname: window.location.hostname,
    origin: window.location.origin,
  };
}

function resolveWidgetScriptUrl(location = getBrowserLocation()) {
  if (location && !isNativeHost(location.hostname)) {
    return `${location.origin}/widget/v1.js`;
  }
  return widgetScriptUrl;
}

export function buildWebWidgetSnippet(
  publicKey: string,
  mode: WebWidgetMode,
  location?: WidgetScriptLocation,
) {
  const installationMode = mode === 'ai_powered' ? 'ai-powered' : 'traditional';
  return `<script
  async
  src="${resolveWidgetScriptUrl(location)}"
  data-kilobot-widget="${publicKey}"
  data-kilobot-mode="${installationMode}"
></script>`;
}
