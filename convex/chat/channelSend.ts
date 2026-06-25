"use node";

import type { Doc } from "../_generated/dataModel";

const DEFAULT_GRAPH_VERSION = "v22.0";

const HOUR_MS = 60 * 60 * 1000;
const MESSAGING_WINDOW_MS = 24 * HOUR_MS;
const HUMAN_AGENT_WINDOW_MS = 7 * 24 * HOUR_MS;

/** Meta Graph API error code: message outside standard messaging window. */
export const META_ERROR_MESSAGING_WINDOW = 10;

function waGraphBase() {
  const version = process.env.META_GRAPH_API_VERSION || DEFAULT_GRAPH_VERSION;
  return `https://graph.facebook.com/${version}`;
}

function igGraphBase() {
  const version = process.env.META_GRAPH_API_VERSION || "v25.0";
  return `https://graph.instagram.com/${version}`;
}

function fbGraphBase() {
  const version = process.env.META_GRAPH_API_VERSION || DEFAULT_GRAPH_VERSION;
  return `https://graph.facebook.com/${version}`;
}

function normalizeMetaAccessToken(raw: string | undefined): string {
  if (raw === undefined) return "";
  let t = raw.trim();
  if (t.charCodeAt(0) === 0xfeff) t = t.slice(1).trim();
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    t = t.slice(1, -1).trim();
  }
  if (t.toLowerCase().startsWith("bearer ")) {
    t = t.slice(7).trim();
  }
  return t;
}

export type ChannelSendPolicy =
  | "messaging_window"
  | "human_agent_tag"
  | "generic";

export type ChannelSendResult =
  | { ok: true; externalId: string | undefined }
  | {
      ok: false;
      error: string;
      errorCode?: number;
      policy?: ChannelSendPolicy;
    };

export type SendTextToChannelOptions = {
  /** When true, Messenger/Instagram may use HUMAN_AGENT tag outside the 24h window. */
  allowHumanAgentTag?: boolean;
};

export type SendMediaToChannelOptions = SendTextToChannelOptions & {
  text?: string;
  imageUrls: string[];
};

export type SendTextAndImageOptions = SendTextToChannelOptions & {
  text: string;
  imageUrls: string[];
};

export type TextAndImageSendResult = {
  imageResult: ChannelSendResult;
  textResult: ChannelSendResult;
};

export type MetaIndicatorResult =
  | { ok: true }
  | { ok: false; error: string; errorCode?: number };

export type MetaMarkSeenOptions = {
  /** Required by WhatsApp read receipts. Ignored for Messenger/Instagram. */
  messageExternalId?: string;
};

export type MetaTypingOptions = MetaMarkSeenOptions;

export type MetaReactionOptions = {
  targetExternalId: string;
  emoji: string;
};

type MetaSenderAction = "mark_seen" | "typing_on" | "typing_off";

export async function sendMetaMarkSeen(
  conversation: Doc<"conversations">,
  channel: Doc<"channels">,
  options: MetaMarkSeenOptions = {},
): Promise<MetaIndicatorResult> {
  switch (conversation.service) {
    case "whatsapp":
      return sendWhatsAppReadReceipt(conversation, channel, {
        messageExternalId: options.messageExternalId,
        includeTypingIndicator: false,
      });
    case "instagram":
      return sendInstagramSenderAction(conversation, channel, "mark_seen");
    case "messenger":
      return sendMessengerSenderAction(conversation, channel, "mark_seen");
    default:
      return { ok: true };
  }
}

export async function sendMetaTypingOn(
  conversation: Doc<"conversations">,
  channel: Doc<"channels">,
  options: MetaTypingOptions = {},
): Promise<MetaIndicatorResult> {
  switch (conversation.service) {
    case "whatsapp":
      return sendWhatsAppReadReceipt(conversation, channel, {
        messageExternalId: options.messageExternalId,
        includeTypingIndicator: true,
      });
    case "instagram":
      return sendInstagramSenderAction(conversation, channel, "typing_on");
    case "messenger":
      return sendMessengerSenderAction(conversation, channel, "typing_on");
    default:
      return { ok: true };
  }
}

export async function sendMetaTypingOff(
  conversation: Doc<"conversations">,
  channel: Doc<"channels">,
): Promise<MetaIndicatorResult> {
  switch (conversation.service) {
    case "whatsapp":
      // WhatsApp Cloud API typing indicators clear when the response is sent.
      return { ok: true };
    case "instagram":
      return sendInstagramSenderAction(conversation, channel, "typing_off");
    case "messenger":
      return sendMessengerSenderAction(conversation, channel, "typing_off");
    default:
      return { ok: true };
  }
}

export async function sendMetaReaction(
  conversation: Doc<"conversations">,
  channel: Doc<"channels">,
  options: MetaReactionOptions,
): Promise<ChannelSendResult> {
  switch (conversation.service) {
    case "whatsapp":
      return sendWhatsAppReaction(conversation, channel, options);
    case "messenger":
      return sendMessengerReaction(conversation, channel, options);
    default:
      return { ok: false, error: "Reactions are not supported for this channel", policy: "generic" };
  }
}

export async function removeMetaReaction(
  conversation: Doc<"conversations">,
  channel: Doc<"channels">,
  options: Omit<MetaReactionOptions, "emoji">,
): Promise<ChannelSendResult> {
  switch (conversation.service) {
    case "whatsapp":
      return sendWhatsAppReaction(conversation, channel, {
        targetExternalId: options.targetExternalId,
        emoji: "",
      });
    case "messenger":
      return sendMessengerUnreact(conversation, channel, options);
    default:
      return { ok: false, error: "Reactions are not supported for this channel", policy: "generic" };
  }
}

/** Instagram/Messenger: media first, then text (two channel messages). */
export async function sendTextAndImage(
  conversation: Doc<"conversations">,
  channel: Doc<"channels">,
  options: SendTextAndImageOptions,
): Promise<TextAndImageSendResult> {
  const imageUrls = options.imageUrls.filter((url) => url.trim().length > 0);
  const trimmed = options.text.trim();
  if (!trimmed) {
    throw new Error("sendTextAndImage requires non-empty text");
  }
  if (imageUrls.length === 0) {
    throw new Error("sendTextAndImage requires at least one image");
  }

  const channelOptions: SendTextToChannelOptions = {
    allowHumanAgentTag: options.allowHumanAgentTag,
  };

  if (conversation.service === "instagram") {
    const imageResult = await sendInstagramMedia(conversation, channel, {
      text: "",
      imageUrls,
      options: channelOptions,
    });
    if (!imageResult.ok) {
      return { imageResult, textResult: imageResult };
    }
    const textResult = await sendInstagram(
      conversation,
      channel,
      trimmed,
      channelOptions,
    );
    return { imageResult, textResult };
  }

  if (conversation.service === "messenger") {
    const imageResult = await sendMessengerMedia(conversation, channel, {
      text: "",
      imageUrls,
      options: channelOptions,
    });
    if (!imageResult.ok) {
      return { imageResult, textResult: imageResult };
    }
    const textResult = await sendMessenger(
      conversation,
      channel,
      trimmed,
      channelOptions,
    );
    return { imageResult, textResult };
  }

  throw new Error("sendTextAndImage requires instagram or messenger");
}

export async function sendMediaToChannel(
  conversation: Doc<"conversations">,
  channel: Doc<"channels">,
  options: SendMediaToChannelOptions,
): Promise<ChannelSendResult> {
  const imageUrls = options.imageUrls.filter((url) => url.trim().length > 0);
  const trimmed = options.text?.trim() ?? "";

  if (imageUrls.length === 0) {
    return sendTextToChannel(conversation, channel, trimmed, options);
  }

  if (conversation.service === "whatsapp") {
    return {
      ok: false,
      error:
        "Image attachments are not supported for WhatsApp yet. Send text only.",
      policy: "generic",
    };
  }

  switch (conversation.service) {
    case "instagram":
      if (trimmed.length > 0) {
        const { textResult } = await sendTextAndImage(conversation, channel, {
          text: trimmed,
          imageUrls,
          allowHumanAgentTag: options.allowHumanAgentTag,
        });
        return textResult;
      }
      return sendInstagramMedia(conversation, channel, {
        text: "",
        imageUrls,
        options,
      });
    case "messenger":
      if (trimmed.length > 0) {
        const { textResult } = await sendTextAndImage(conversation, channel, {
          text: trimmed,
          imageUrls,
          allowHumanAgentTag: options.allowHumanAgentTag,
        });
        return textResult;
      }
      return sendMessengerMedia(conversation, channel, {
        text: "",
        imageUrls,
        options,
      });
    default:
      return { ok: false, error: "Unsupported service", policy: "generic" };
  }
}

export async function sendTextToChannel(
  conversation: Doc<"conversations">,
  channel: Doc<"channels">,
  content: string,
  options?: SendTextToChannelOptions,
): Promise<ChannelSendResult> {
  const trimmed = content.trim();
  if (!trimmed) {
    return { ok: false, error: "Cannot send an empty message", policy: "generic" };
  }

  switch (conversation.service) {
    case "whatsapp":
      return sendWhatsApp(conversation, channel, trimmed);
    case "instagram":
      return sendInstagram(conversation, channel, trimmed, options);
    case "messenger":
      return sendMessenger(conversation, channel, trimmed, options);
    default:
      return { ok: false, error: "Unsupported service", policy: "generic" };
  }
}

export function formatChannelSendError(result: Extract<ChannelSendResult, { ok: false }>): string {
  if (result.policy === "messaging_window" || result.errorCode === META_ERROR_MESSAGING_WINDOW) {
    return (
      "This customer is outside Meta's messaging window. They need to message you first, " +
      "or you can reply within 7 days using human-agent messaging (team replies only)."
    );
  }
  return result.error;
}

export function throwIfChannelSendFailed(
  result: ChannelSendResult,
): asserts result is Extract<ChannelSendResult, { ok: true }> {
  if (!result.ok) {
    throw new Error(formatChannelSendError(result));
  }
}

function messagingWindowState(
  conversation: Doc<"conversations">,
  now: number = Date.now(),
): "standard" | "human_agent" | "blocked" {
  const last = conversation.lastCustomerMessageAt;
  if (last === undefined) {
    return "human_agent";
  }
  const elapsed = now - last;
  if (elapsed <= MESSAGING_WINDOW_MS) return "standard";
  if (elapsed <= HUMAN_AGENT_WINDOW_MS) return "human_agent";
  return "blocked";
}

function resolveWhatsAppAccessToken(channel: Doc<"channels">): {
  accessToken: string;
  error?: string;
} {
  const accessToken = (channel.accessToken ?? "").trim();
  return {
    accessToken,
    error: accessToken ? undefined : "WhatsApp channel is not connected",
  };
}

async function sendWhatsAppReadReceipt(
  _conversation: Doc<"conversations">,
  channel: Doc<"channels">,
  options: {
    messageExternalId?: string;
    includeTypingIndicator: boolean;
  },
): Promise<MetaIndicatorResult> {
  if (channel.status !== "connected" || !channel.phoneNumberId) {
    return { ok: false, error: "WhatsApp channel is not connected" };
  }
  if (!options.messageExternalId) {
    return { ok: false, error: "WhatsApp message id is required" };
  }

  const { accessToken, error } = resolveWhatsAppAccessToken(channel);
  if (!accessToken) {
    return { ok: false, error: error ?? "WhatsApp channel is not connected" };
  }

  const body: Record<string, unknown> = {
    messaging_product: "whatsapp",
    status: "read",
    message_id: options.messageExternalId,
  };
  if (options.includeTypingIndicator) {
    body.typing_indicator = { type: "text" };
  }

  const res = await fetch(`${waGraphBase()}/${channel.phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return parseMetaIndicatorResponse(res);
}

async function sendInstagramSenderAction(
  conversation: Doc<"conversations">,
  channel: Doc<"channels">,
  senderAction: MetaSenderAction,
): Promise<MetaIndicatorResult> {
  if (channel.status !== "connected" || !channel.igUserId) {
    return { ok: false, error: "Instagram channel is not connected" };
  }
  const accessToken = normalizeMetaAccessToken(channel.accessToken);
  if (!accessToken) {
    return { ok: false, error: "Instagram channel is not connected" };
  }
  return sendMetaSenderAction(
    `${fbGraphBase()}/me/messages`,
    accessToken,
    conversation.contactAddress,
    senderAction,
  );
}

async function sendMessengerSenderAction(
  conversation: Doc<"conversations">,
  channel: Doc<"channels">,
  senderAction: MetaSenderAction,
): Promise<MetaIndicatorResult> {
  if (channel.status !== "connected" || !channel.pageId) {
    return { ok: false, error: "Messenger channel is not connected" };
  }
  const accessToken = normalizeMetaAccessToken(channel.accessToken);
  if (!accessToken) {
    return { ok: false, error: "Messenger channel is not connected" };
  }
  return sendMetaSenderAction(
    `${fbGraphBase()}/${channel.pageId}/messages`,
    accessToken,
    conversation.contactAddress,
    senderAction,
  );
}

async function sendMetaSenderAction(
  url: string,
  accessToken: string,
  recipientId: string,
  senderAction: MetaSenderAction,
): Promise<MetaIndicatorResult> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      recipient: { id: recipientId },
      sender_action: senderAction,
    }),
  });

  return parseMetaIndicatorResponse(res);
}

async function sendWhatsApp(
  conversation: Doc<"conversations">,
  channel: Doc<"channels">,
  trimmed: string,
): Promise<ChannelSendResult> {
  if (channel.status !== "connected" || !channel.phoneNumberId) {
    return { ok: false, error: "WhatsApp channel is not connected", policy: "generic" };
  }

  const { accessToken, error } = resolveWhatsAppAccessToken(channel);
  if (!accessToken) {
    return {
      ok: false,
      error: error ?? "WhatsApp channel is not connected",
      policy: "generic",
    };
  }

  const url = `${waGraphBase()}/${channel.phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: conversation.contactAddress,
      type: "text",
      text: { body: trimmed },
    }),
  });

  return parseGraphResponse(res);
}

async function sendWhatsAppReaction(
  conversation: Doc<"conversations">,
  channel: Doc<"channels">,
  options: MetaReactionOptions,
): Promise<ChannelSendResult> {
  if (channel.status !== "connected" || !channel.phoneNumberId) {
    return { ok: false, error: "WhatsApp channel is not connected", policy: "generic" };
  }

  const { accessToken, error } = resolveWhatsAppAccessToken(channel);
  if (!accessToken) {
    return {
      ok: false,
      error: error ?? "WhatsApp channel is not connected",
      policy: "generic",
    };
  }

  const res = await fetch(`${waGraphBase()}/${channel.phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: conversation.contactAddress,
      type: "reaction",
      reaction: {
        message_id: options.targetExternalId,
        emoji: options.emoji,
      },
    }),
  });

  return parseGraphResponse(res);
}

async function sendInstagram(
  conversation: Doc<"conversations">,
  channel: Doc<"channels">,
  trimmed: string,
  options?: SendTextToChannelOptions,
): Promise<ChannelSendResult> {
  if (channel.status !== "connected" || !channel.igUserId) {
    return { ok: false, error: "Instagram channel is not connected", policy: "generic" };
  }
  const bytes = new TextEncoder().encode(trimmed).length;
  if (bytes > 1000) {
    return {
      ok: false,
      error: "Instagram text messages must be 1000 bytes or less (UTF-8)",
      policy: "generic",
    };
  }

  const windowState = messagingWindowState(conversation);
  if (windowState === "blocked") {
    return {
      ok: false,
      error: "Outside Instagram messaging window",
      policy: "messaging_window",
    };
  }

  const accessToken = normalizeMetaAccessToken(channel.accessToken);
  if (!accessToken) {
    return { ok: false, error: "Instagram channel is not connected", policy: "generic" };
  }

  const useHumanAgent =
    windowState === "human_agent" && options?.allowHumanAgentTag === true;

  const body: Record<string, unknown> = {
    message: { text: trimmed },
    recipient: { id: conversation.contactAddress },
  };
  if (useHumanAgent) {
    body.messaging_type = "MESSAGE_TAG";
    body.tag = "HUMAN_AGENT";
  }

  const res = await fetch(`${igGraphBase()}/me/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const parsed = await parseGraphResponse(res);
  if (
    !parsed.ok &&
    parsed.errorCode === META_ERROR_MESSAGING_WINDOW &&
    windowState === "human_agent" &&
    options?.allowHumanAgentTag &&
    !useHumanAgent
  ) {
    return sendInstagram(conversation, channel, trimmed, {
      ...options,
      allowHumanAgentTag: true,
    });
  }
  return parsed;
}

function buildImageAttachments(imageUrls: string[]) {
  return imageUrls.map((url) => ({
    type: "image" as const,
    payload: { url },
  }));
}

async function sendInstagramMedia(
  conversation: Doc<"conversations">,
  channel: Doc<"channels">,
  args: {
    text: string;
    imageUrls: string[];
    options?: SendTextToChannelOptions;
  },
): Promise<ChannelSendResult> {
  if (channel.status !== "connected" || !channel.igUserId) {
    return { ok: false, error: "Instagram channel is not connected", policy: "generic" };
  }

  const trimmed = args.text;
  if (trimmed.length > 0) {
    const bytes = new TextEncoder().encode(trimmed).length;
    if (bytes > 1000) {
      return {
        ok: false,
        error: "Instagram text messages must be 1000 bytes or less (UTF-8)",
        policy: "generic",
      };
    }
  }

  const windowState = messagingWindowState(conversation);
  if (windowState === "blocked") {
    return {
      ok: false,
      error: "Outside Instagram messaging window",
      policy: "messaging_window",
    };
  }

  const accessToken = normalizeMetaAccessToken(channel.accessToken);
  if (!accessToken) {
    return { ok: false, error: "Instagram channel is not connected", policy: "generic" };
  }

  const useHumanAgent =
    windowState === "human_agent" && args.options?.allowHumanAgentTag === true;

  const message: Record<string, unknown> = {
    attachments: buildImageAttachments(args.imageUrls),
  };
  if (trimmed.length > 0) {
    message.text = trimmed;
  }

  const body: Record<string, unknown> = {
    message,
    recipient: { id: conversation.contactAddress },
  };
  if (useHumanAgent) {
    body.messaging_type = "MESSAGE_TAG";
    body.tag = "HUMAN_AGENT";
  }

  const res = await fetch(`${igGraphBase()}/me/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const parsed = await parseGraphResponse(res);
  if (
    !parsed.ok &&
    parsed.errorCode === META_ERROR_MESSAGING_WINDOW &&
    windowState === "human_agent" &&
    args.options?.allowHumanAgentTag &&
    !useHumanAgent
  ) {
    return sendInstagramMedia(conversation, channel, {
      ...args,
      options: { ...args.options, allowHumanAgentTag: true },
    });
  }
  return parsed;
}

async function sendMessenger(
  conversation: Doc<"conversations">,
  channel: Doc<"channels">,
  trimmed: string,
  options?: SendTextToChannelOptions,
): Promise<ChannelSendResult> {
  if (channel.status !== "connected" || !channel.pageId) {
    return { ok: false, error: "Messenger channel is not connected", policy: "generic" };
  }
  const accessToken = normalizeMetaAccessToken(channel.accessToken);
  if (!accessToken) {
    return { ok: false, error: "Messenger channel is not connected", policy: "generic" };
  }

  const windowState = messagingWindowState(conversation);
  if (windowState === "blocked") {
    return {
      ok: false,
      error: "Outside Messenger messaging window",
      policy: "messaging_window",
    };
  }

  const useHumanAgent =
    windowState === "human_agent" && options?.allowHumanAgentTag === true;

  const payload: Record<string, unknown> = {
    recipient: { id: conversation.contactAddress },
    message: { text: trimmed },
  };
  if (useHumanAgent) {
    payload.messaging_type = "MESSAGE_TAG";
    payload.tag = "HUMAN_AGENT";
  } else {
    payload.messaging_type = "RESPONSE";
  }

  const res = await fetch(`${fbGraphBase()}/me/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const parsed = await parseGraphResponse(res);
  if (
    !parsed.ok &&
    parsed.errorCode === META_ERROR_MESSAGING_WINDOW &&
    windowState === "human_agent" &&
    options?.allowHumanAgentTag &&
    !useHumanAgent
  ) {
    return sendMessenger(conversation, channel, trimmed, {
      ...options,
      allowHumanAgentTag: true,
    });
  }
  return parsed;
}

async function sendMessengerReaction(
  conversation: Doc<"conversations">,
  channel: Doc<"channels">,
  options: MetaReactionOptions,
): Promise<ChannelSendResult> {
  return sendMessengerReactionAction(conversation, channel, {
    senderAction: "react",
    targetExternalId: options.targetExternalId,
    emoji: options.emoji,
  });
}

async function sendMessengerUnreact(
  conversation: Doc<"conversations">,
  channel: Doc<"channels">,
  options: Omit<MetaReactionOptions, "emoji">,
): Promise<ChannelSendResult> {
  return sendMessengerReactionAction(conversation, channel, {
    senderAction: "unreact",
    targetExternalId: options.targetExternalId,
  });
}

async function sendMessengerReactionAction(
  conversation: Doc<"conversations">,
  channel: Doc<"channels">,
  options: {
    senderAction: "react" | "unreact";
    targetExternalId: string;
    emoji?: string;
  },
): Promise<ChannelSendResult> {
  if (channel.status !== "connected" || !channel.pageId) {
    return { ok: false, error: "Messenger channel is not connected", policy: "generic" };
  }
  const accessToken = normalizeMetaAccessToken(channel.accessToken);
  if (!accessToken) {
    return { ok: false, error: "Messenger channel is not connected", policy: "generic" };
  }

  const payload: Record<string, unknown> = {
    recipient: { id: conversation.contactAddress },
    sender_action: options.senderAction,
    payload: {
      message_id: options.targetExternalId,
      ...(options.senderAction === "react" ? { reaction: options.emoji } : {}),
    },
  };

  const res = await fetch(`${fbGraphBase()}/me/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseGraphResponse(res);
}

async function sendMessengerMedia(
  conversation: Doc<"conversations">,
  channel: Doc<"channels">,
  args: {
    text: string;
    imageUrls: string[];
    options?: SendTextToChannelOptions;
  },
): Promise<ChannelSendResult> {
  if (channel.status !== "connected" || !channel.pageId) {
    return { ok: false, error: "Messenger channel is not connected", policy: "generic" };
  }
  const accessToken = normalizeMetaAccessToken(channel.accessToken);
  if (!accessToken) {
    return { ok: false, error: "Messenger channel is not connected", policy: "generic" };
  }

  const windowState = messagingWindowState(conversation);
  if (windowState === "blocked") {
    return {
      ok: false,
      error: "Outside Messenger messaging window",
      policy: "messaging_window",
    };
  }

  const useHumanAgent =
    windowState === "human_agent" && args.options?.allowHumanAgentTag === true;

  const message: Record<string, unknown> = {
    attachments: buildImageAttachments(args.imageUrls),
  };
  if (args.text.length > 0) {
    message.text = args.text;
  }

  const payload: Record<string, unknown> = {
    recipient: { id: conversation.contactAddress },
    message,
  };
  if (useHumanAgent) {
    payload.messaging_type = "MESSAGE_TAG";
    payload.tag = "HUMAN_AGENT";
  } else {
    payload.messaging_type = "RESPONSE";
  }

  const res = await fetch(`${fbGraphBase()}/me/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const parsed = await parseGraphResponse(res);
  if (
    !parsed.ok &&
    parsed.errorCode === META_ERROR_MESSAGING_WINDOW &&
    windowState === "human_agent" &&
    args.options?.allowHumanAgentTag &&
    !useHumanAgent
  ) {
    return sendMessengerMedia(conversation, channel, {
      ...args,
      options: { ...args.options, allowHumanAgentTag: true },
    });
  }
  return parsed;
}

async function parseMetaIndicatorResponse(
  res: Response,
): Promise<MetaIndicatorResult> {
  const text = await res.text();
  let body: {
    error?: { message?: string; code?: number; error_subcode?: number };
  } | null = null;
  try {
    body = text.length ? JSON.parse(text) : null;
  } catch {
    body = null;
  }

  if (!res.ok) {
    return {
      ok: false,
      error: body?.error?.message ?? `HTTP ${res.status}`,
      errorCode: body?.error?.code,
    };
  }

  return { ok: true };
}

async function parseGraphResponse(res: Response): Promise<ChannelSendResult> {
  const text = await res.text();
  let body: {
    messages?: Array<{ id?: string }>;
    message_id?: string;
    id?: string;
    error?: { message?: string; code?: number; error_subcode?: number };
  } | null = null;
  try {
    body = text.length ? JSON.parse(text) : null;
  } catch {
    body = null;
  }

  if (!res.ok) {
    const errorCode = body?.error?.code;
    const policy: ChannelSendPolicy | undefined =
      errorCode === META_ERROR_MESSAGING_WINDOW ? "messaging_window" : "generic";
    return {
      ok: false,
      error: body?.error?.message ?? `HTTP ${res.status}`,
      errorCode,
      policy,
    };
  }

  const externalId = body?.messages?.[0]?.id ?? body?.message_id ?? body?.id;
  return { ok: true, externalId };
}
