"use node";

import type { Doc } from "../_generated/dataModel";

const WHATSAPP_DEMO_ACCESS_SENTINEL = "__whatsapp_demo__";
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

async function sendWhatsApp(
  conversation: Doc<"conversations">,
  channel: Doc<"channels">,
  trimmed: string,
): Promise<ChannelSendResult> {
  if (channel.status !== "connected" || !channel.phoneNumberId) {
    return { ok: false, error: "WhatsApp channel is not connected", policy: "generic" };
  }

  const isDemoChannel = channel.accessToken === WHATSAPP_DEMO_ACCESS_SENTINEL;
  const accessToken = isDemoChannel
    ? (process.env.WHATSAPP_DEMO_ACCESS_TOKEN ?? "").trim()
    : (channel.accessToken ?? "").trim();
  if (!accessToken) {
    return {
      ok: false,
      error: isDemoChannel
        ? "Set WHATSAPP_DEMO_ACCESS_TOKEN on your Convex deployment"
        : "WhatsApp channel is not connected",
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
