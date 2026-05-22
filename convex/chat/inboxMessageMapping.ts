import { listMessages } from "@convex-dev/agent";
import { toUIMessages } from "@convex-dev/agent";
import { sorted } from "@convex-dev/agent";
import type { MessageDoc } from "@convex-dev/agent";
import type { UIMessage } from "@convex-dev/agent/react";
import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

/** Invisible user turn so each outbound assistant message gets its own `order`. */
export const INBOX_ORDER_SPACER_TEXT = "\u200B";

export type InboxOutboundMeta = {
  agentName: string;
  sentByAi: boolean;
  authorUserId?: string;
};

export type InboxMessageMetadata = {
  inboxOrderSpacer?: boolean;
  /** When the message was sent on the channel (not thread upload time). */
  sentAt?: number;
  inboxOutbound?: InboxOutboundMeta;
  llmModel?: string;
  creditsCharged?: number;
};

export type InboxUIMessage = UIMessage & {
  sentByAi?: boolean;
};

type MessageDocWithMeta = MessageDoc & {
  metadata?: InboxMessageMetadata;
  agentName?: string;
};

export function isInboxOrderSpacerDoc(doc: MessageDoc): boolean {
  const meta = (doc as MessageDocWithMeta).metadata;
  if (meta?.inboxOrderSpacer === true) return true;
  const text = doc.text?.trim() ?? "";
  return text === INBOX_ORDER_SPACER_TEXT;
}

function legacySentByAi(
  doc: MessageDocWithMeta,
  uiRole: UIMessage["role"],
): boolean | undefined {
  if (uiRole !== "assistant") return undefined;
  const meta = doc.metadata?.inboxOutbound;
  if (meta !== undefined) return meta.sentByAi;
  const legacyName = doc.agentName?.trim();
  if (!legacyName) return true;
  return undefined;
}

function resolveAgentName(
  doc: MessageDocWithMeta,
  uiRole: UIMessage["role"],
  fallbackChannelName: string,
): string | undefined {
  if (uiRole !== "assistant") return undefined;
  const outbound = doc.metadata?.inboxOutbound;
  if (outbound) {
    const isAi = outbound.sentByAi === true;
    const isUser = !!outbound.authorUserId;
    if (isAi || isUser) {
      return outbound.agentName?.trim() || "Unknown agent";
    }
    return fallbackChannelName;
  }
  const legacy = doc.agentName?.trim();
  if (legacy && legacy !== "Unknown agent") return legacy;
  return fallbackChannelName;
}

function agentMessageDocId(doc: MessageDoc): string | undefined {
  const d = doc as MessageDoc & { id?: string; _id?: string };
  return d.id ?? d._id;
}

function resolveSentAt(
  doc: MessageDocWithMeta,
  sentAtByAgentMessageId: Map<string, number>,
): number {
  const metaSentAt = doc.metadata?.sentAt;
  if (metaSentAt !== undefined) return metaSentAt;
  const docId = agentMessageDocId(doc);
  if (docId !== undefined) {
    const fromLedger = sentAtByAgentMessageId.get(docId);
    if (fromLedger !== undefined) return fromLedger;
  }
  return doc._creationTime;
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
  for (const row of ledgerRows) {
    if (row.agentMessageId) {
      sentAtByAgentMessageId.set(row.agentMessageId, row.createdAt);
    }
  }

  const conversation = await ctx.db.get(conversationId);
  const channel = conversation?.channelId
    ? await ctx.db.get(conversation.channelId)
    : null;

  let fallbackChannelName = "Unknown agent";
  if (channel) {
    if (channel.service === "whatsapp") {
      fallbackChannelName =
        channel.displayPhoneNumber ??
        channel.phoneNumberId ??
        channel.wabaId ??
        "WhatsApp";
    } else {
      fallbackChannelName =
        channel.displayUsername ??
        channel.pageId ??
        channel.igUserId ??
        (channel.service === "instagram" ? "Instagram" : "Messenger");
    }
  }

  return sorted(docs)
    .filter((doc) => !isInboxOrderSpacerDoc(doc))
    .flatMap((doc) => {
      const withMeta = doc as MessageDocWithMeta;
      const [ui] = toUIMessages([doc]);
      if (!ui) return [];
      const sentByAi = legacySentByAi(withMeta, ui.role);
      const agentName = resolveAgentName(withMeta, ui.role, fallbackChannelName);
      const sentAt = resolveSentAt(withMeta, sentAtByAgentMessageId);
      return [
        {
          ...ui,
          _creationTime: sentAt,
          ...(agentName !== undefined ? { agentName } : {}),
          ...(sentByAi !== undefined ? { sentByAi } : {}),
        },
      ];
    });
}

export { listMessages };
