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

type LocalTraditionalSnippetArgs = {
  label: string;
  prefillMessage: string;
  poweredBy: boolean;
};

const localTraditionalRuntimeUrl = 'http://localhost:5173/widget/traditional.js';
const localTraditionalTestNumber = '60129499394';

function safeScriptJson(value: unknown) {
  return JSON.stringify(value)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026');
}

export function buildLocalTraditionalWidgetSnippet({
  label,
  prefillMessage,
  poweredBy,
}: LocalTraditionalSnippetArgs) {
  const message = prefillMessage.trim() || 'Hi! This is a local Kilobot widget test.';
  const config = safeScriptJson({
    publicKey: 'local-traditional-preview',
    label: label.trim() || 'Chat with us',
    mainColor: '#25D366',
    foregroundColor: '#000000',
    poweredBy,
    destinationUrl: `https://wa.me/${localTraditionalTestNumber}?text=${encodeURIComponent(message)}`,
  });

  return `<script>
(() => {
  const script = document.createElement('script');
  script.async = true;
  script.src = '${localTraditionalRuntimeUrl}';
  script.onload = () => {
    window.KilobotTraditionalWidget.mount(${config}, 'local-traditional-preview');
  };
  document.head.appendChild(script);
})();
</script>`;
}
