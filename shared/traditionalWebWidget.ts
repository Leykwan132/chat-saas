export const WEB_WIDGET_MODES = ["ai_powered", "traditional"] as const;

export type WebWidgetMode = (typeof WEB_WIDGET_MODES)[number];

export const DEFAULT_WEB_WIDGET_MODE: WebWidgetMode = "ai_powered";
export const DEFAULT_TRADITIONAL_WIDGET_LABEL = "Chat with us";
export const DEFAULT_TRADITIONAL_WIDGET_COLOR = "#25D366";

export function defaultTraditionalWidgetMessage(displayUsername: string) {
  const normalizedName = displayUsername.trim();
  if (!normalizedName) {
    throw new Error("WhatsApp account name is unavailable");
  }
  return `Hi, I'd like to get in touch with the ${normalizedName} team. Can someone help me?`;
}

export function normalizeTraditionalWidgetLabel(label: string) {
  const normalizedLabel = label.trim();
  if (!normalizedLabel) {
    throw new Error("Pill label is required");
  }
  if (normalizedLabel.length > 40) {
    throw new Error("Pill label must be 40 characters or fewer");
  }
  return normalizedLabel;
}

export function normalizeTraditionalWidgetMessage(message: string) {
  const normalizedMessage = message.trim();
  if (!normalizedMessage) {
    throw new Error("Prefilled message is required");
  }
  if (normalizedMessage.length > 500) {
    throw new Error("Prefilled message must be 500 characters or fewer");
  }
  return normalizedMessage;
}

export function normalizeTraditionalWidgetColor(color: string) {
  const normalizedColor = color.trim().toUpperCase();
  if (!/^#[0-9A-F]{6}$/.test(normalizedColor)) {
    throw new Error("Main color must use #RRGGBB format");
  }
  return normalizedColor;
}

function relativeLuminance(color: string) {
  const channels = [1, 3, 5].map((offset) => {
    const value = Number.parseInt(color.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

export function traditionalWidgetForeground(color: string) {
  const normalizedColor = normalizeTraditionalWidgetColor(color);
  const luminance = relativeLuminance(normalizedColor);
  const blackContrast = (luminance + 0.05) / 0.05;
  const whiteContrast = 1.05 / (luminance + 0.05);
  return blackContrast >= whiteContrast ? "#000000" : "#FFFFFF";
}

export function traditionalWhatsAppUrl(
  displayPhoneNumber: string,
  prefillMessage: string,
) {
  const phoneNumber = displayPhoneNumber.replace(/\D/g, "");
  if (!phoneNumber) {
    throw new Error("WhatsApp phone number is unavailable");
  }
  const params = new URLSearchParams({
    text: normalizeTraditionalWidgetMessage(prefillMessage),
  });
  return `https://wa.me/${phoneNumber}?${params.toString()}`;
}
