export type WidgetInit = {
  source: "kilobot-host";
  version: 1;
  type: "init";
  publicKey: string;
  visitorId: string;
  apiBase: string;
  pageUrl: string;
};

export function isWidgetInit(value: unknown): value is WidgetInit {
  if (typeof value !== "object" || value === null) return false;
  const message = value as Record<string, unknown>;
  return message.source === "kilobot-host" && message.version === 1 && message.type === "init"
    && typeof message.publicKey === "string" && typeof message.visitorId === "string"
    && typeof message.apiBase === "string" && typeof message.pageUrl === "string";
}
