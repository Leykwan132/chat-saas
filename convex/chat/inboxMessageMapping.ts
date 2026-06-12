import { listMessages, toUIMessages, sorted } from "@convex-dev/agent";
import type { MessageDoc } from "@convex-dev/agent";
import type { UIMessage } from "@convex-dev/agent/react";
import type { Id, Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import type { InboxAttachment } from "../../shared/inboxAttachments";
import { readInboxAttachmentsFromProviderMetadata } from "../../shared/inboxAttachments";
import type { InboxMessageReaction } from "../../shared/messageReactions";

/** Invisible user turn so each outbound assistant message gets its own `order`. */
export const INBOX_ORDER_SPACER_TEXT = "\u200B";

export type HumanProviderMetadata = {
  userId?: string;
  username?: string;
};

export type AIProviderMetadata = {
  agentName: string;
};

export type ChannelProviderMetadata = {
  name: string;
};

export type InboxOutboundMeta = {
  agentName: string;
  sentByAi: boolean;
  authorUserId?: string;
  authorName?: string;
  channelName?: string;
};

export type InboxMessageMetadata = {
  inboxOrderSpacer?: boolean;
  /** When the message was sent on the channel (not thread upload time). */
  sentAt?: number;
  inboxOutbound?: InboxOutboundMeta;
  provider?: "human" | "ai" | "channel";
  providerMetadata?: {
    human?: HumanProviderMetadata;
    ai?: AIProviderMetadata;
    channel?: ChannelProviderMetadata;
    inbox?: {
      attachments: InboxAttachment[];
    };
  };
  llmModel?: string;
  creditsCharged?: number;
};

export type InboxUIMessage = UIMessage & {
  sentByAi?: boolean;
  inboxAttachments?: InboxAttachment[];
  ledgerMessageId?: string;
  externalId?: string;
  channelStatus?: Doc<"messages">["status"];
  channelStatusUpdatedAt?: number;
  readAt?: number;
  failureReason?: string;
  reactions?: InboxMessageReaction[];
};

export function isInboxOrderSpacerDoc(doc: MessageDoc): boolean {
  const text = doc.text?.trim() ?? "";
  return text === INBOX_ORDER_SPACER_TEXT;
}

export function getChannelName(channel: Doc<"channels">): string {
  if (channel.service === "whatsapp") {
    return (
      channel.displayPhoneNumber ??
      channel.phoneNumberId ??
      channel.wabaId ??
      "WhatsApp"
    );
  }
  return (
    channel.displayUsername ??
    channel.pageId ??
    channel.igUserId ??
    (channel.service === "instagram" ? "Instagram" : "Messenger")
  );
}

function resolveSentByAi(
  doc: MessageDoc,
  uiRole: UIMessage["role"],
): boolean | undefined {
  if (uiRole !== "assistant") return undefined;
  if (doc.provider !== undefined) {
    return doc.provider === "ai";
  }
  const legacyName = doc.agentName?.trim();
  if (!legacyName) return true;
  return undefined;
}

function resolveAgentName(
  doc: MessageDoc,
  uiRole: UIMessage["role"],
  fallbackChannelName: string,
  userIdToName: Map<string, string>,
): string | undefined {
  if (uiRole !== "assistant") return undefined;

  const providerMetadata = doc.providerMetadata as InboxMessageMetadata["providerMetadata"];

  // 1. Check new metadata format
  if (doc.provider !== undefined) {
    if (doc.provider === "human") {
      const human = providerMetadata?.human;
      if (human?.userId && userIdToName.has(human.userId)) {
        return userIdToName.get(human.userId);
      }
      return human?.username ?? fallbackChannelName;
    }
    if (doc.provider === "ai") {
      return providerMetadata?.ai?.agentName ?? doc.agentName?.trim() ?? "Unknown agent";
    }
    if (doc.provider === "channel") {
      return providerMetadata?.channel?.name ?? fallbackChannelName;
    }
  }

  // 2. Legacy fallback to agentName field
  const legacy = doc.agentName?.trim();
  if (legacy && legacy !== "Unknown agent") return legacy;
  return fallbackChannelName;
}

function agentMessageDocId(doc: MessageDoc): string | undefined {
  const d = doc as MessageDoc & { id?: string; _id?: string };
  return d.id ?? d._id;
}

function resolveSentAt(
  doc: MessageDoc,
  sentAtByAgentMessageId: Map<string, number>,
): number {
  const docId = agentMessageDocId(doc);
  if (docId !== undefined) {
    const fromLedger = sentAtByAgentMessageId.get(docId);
    if (fromLedger !== undefined) return fromLedger;
  }
  return doc._creationTime;
}

function readInboxAttachments(doc: MessageDoc): InboxAttachment[] | undefined {
  return readInboxAttachmentsFromProviderMetadata(doc.providerMetadata);
}

/** One MessageDoc → one UIMessage (avoids merging consecutive assistant rows). */
export async function messageDocsToInboxUIMessages(
  ctx: QueryCtx,
  conversationId: Id<"conversations">,
  docs: MessageDoc[],
): Promise<InboxUIMessage[]> {
  const ledgerRows = await ctx.db
    .query("messages")
    .withIndex("by_conversationId_and_createdAt", (q) =>
      q.eq("conversationId", conversationId),
    )
    .collect();

  const sentAtByAgentMessageId = new Map<string, number>();
  const ledgerByAgentMessageId = new Map<string, Doc<"messages">>();
  for (const row of ledgerRows) {
    if (row.agentMessageId) {
      sentAtByAgentMessageId.set(row.agentMessageId, row.createdAt);
      ledgerByAgentMessageId.set(row.agentMessageId, row);
    }
  }

  const conversation = await ctx.db.get(conversationId);
  const channel = conversation?.channelId
    ? await ctx.db.get(conversation.channelId)
    : null;

  let fallbackChannelName = "Unknown agent";
  if (channel) {
    fallbackChannelName = getChannelName(channel);
  }

  // Gather user IDs to look up team member names
  const workosUserIds = new Set<string>();
  for (const doc of docs) {
    const providerMetadata = doc.providerMetadata as InboxMessageMetadata["providerMetadata"];
    const providerUserId = providerMetadata?.human?.userId;
    if (providerUserId) {
      workosUserIds.add(providerUserId);
    }
  }

  const userIdToName = new Map<string, string>();
  for (const workosUserId of workosUserIds) {
    const user = await ctx.db
      .query("users")
      .withIndex("by_workosUserId", (q) => q.eq("workosUserId", workosUserId))
      .unique();
    if (user) {
      const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.email;
      userIdToName.set(workosUserId, name);
    }
  }

  return sorted(docs)
    .filter((doc) => !isInboxOrderSpacerDoc(doc))
    .flatMap((doc) => {
      const [ui] = toUIMessages([doc]);
      if (!ui) return [];
      const sentByAi = resolveSentByAi(doc, ui.role);
      const agentName = resolveAgentName(doc, ui.role, fallbackChannelName, userIdToName);
      const sentAt = resolveSentAt(doc, sentAtByAgentMessageId);
      const inboxAttachments = readInboxAttachments(doc);
      const docId = agentMessageDocId(doc);
      const ledger = docId ? ledgerByAgentMessageId.get(docId) : undefined;
      return [
        {
          ...ui,
          _creationTime: sentAt,
          ...(ledger !== undefined
            ? {
                ledgerMessageId: ledger._id,
                externalId: ledger.externalId,
                channelStatus: ledger.status,
                channelStatusUpdatedAt: ledger.statusUpdatedAt,
                readAt: ledger.readAt,
                failureReason: ledger.failureReason,
                reactions: ledger.reactions,
              }
            : {}),
          ...(agentName !== undefined ? { agentName } : {}),
          ...(sentByAi !== undefined ? { sentByAi } : {}),
          ...(inboxAttachments !== undefined ? { inboxAttachments } : {}),
        },
      ];
    });
}

export { listMessages };
