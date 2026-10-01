import type { Doc } from "../_generated/dataModel";
import { normalizeTelegramPhone } from "./phone";

const channelLabels: Record<string, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  messenger: "Messenger",
  web: "Web",
  unknown: "Unknown",
  avatar: "Avatar",
  playground: "Test chat",
};

export function escalationChannelLabel(service: string): string {
  return channelLabels[service] ?? service;
}

export function escalationInboxUrl(origin: string, agentId: string, conversationId?: string): string {
  const base = origin.replace(/\/$/, "");
  const params = new URLSearchParams(conversationId ? { conversation: conversationId } : {});
  return `${base}/dashboard/${agentId}/inbox${conversationId ? `?${params.toString()}` : ""}`;
}

export function notificationConversationUrl(
  origin: string,
  agentId: string,
  conversation: Pick<Doc<"conversations">, "_id" | "service" | "contactAddress"> | null,
  customer: Pick<Doc<"customers">, "service" | "contactAddress" | "phone" | "whatsappUsername"> | null,
): string {
  const service = conversation?.service ?? customer?.service;
  if (service !== "whatsapp") return escalationInboxUrl(origin, agentId, conversation?._id);
  const address = conversation?.contactAddress ?? customer?.contactAddress ?? "";
  const phone = /[A-Za-z]/.test(address) ? customer?.phone : address;
  if (phone?.trim()) return `https://wa.me/${normalizeTelegramPhone(phone)}`;
  const username = customer?.whatsappUsername?.trim().replace(/^@/, "");
  if (username) return `https://wa.me/${encodeURIComponent(username)}`;
  throw new Error("Customer WhatsApp phone number or username is required for the notification chat link");
}
