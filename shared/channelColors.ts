export const CONVERSATION_CHANNEL_SERVICES = [
  "whatsapp",
  "instagram",
  "messenger",
  "web",
] as const;

export type ConversationChannelService =
  (typeof CONVERSATION_CHANNEL_SERVICES)[number];

export const CONVERSATION_CHANNEL_LABELS: Record<
  ConversationChannelService,
  string
> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  messenger: "Messenger",
  web: "Web",
};

/** Brand colors used for channel icons and UI accents. */
export const CONVERSATION_CHANNEL_BRAND_COLORS: Record<
  ConversationChannelService,
  string
> = {
  whatsapp: "#25D366",
  instagram: "#E4405F",
  messenger: "#0866FF",
  web: "#111827",
};

/** Softer chart fills that stay distinct on analytics backgrounds. */
export const CONVERSATION_CHANNEL_CHART_COLORS: Record<
  ConversationChannelService,
  string
> = {
  whatsapp: "#62C9A4",
  instagram: "#E0A0B8",
  messenger: "#84B0E6",
  web: "#A3A3A3",
};
