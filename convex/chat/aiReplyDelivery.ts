"use node";

import type { ActionCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import {
  sendTextToChannel,
  sendMediaToChannel,
  type ChannelMediaItem,
  type ChannelSendPolicy,
} from "./channelSend";
import { normalizeCustomerFacingResponseFormatting } from "./responseFormatting";

export type AiReplySendResult = {
  ok: boolean;
  error?: string;
  policy?: ChannelSendPolicy;
  textExternalId?: string;
  mediaExternalIds?: string[];
};

export async function sendAiReplyContent(
  ctx: ActionCtx,
  conversation: Doc<"conversations">,
  channel: Doc<"channels">,
  customer: Doc<"customers"> | null,
  args: {
    content: string;
    mediaUrls: string[];
    mediaItems?: ChannelMediaItem[];
    allowHumanAgentTag?: boolean;
  },
): Promise<AiReplySendResult> {
  const isAiAssigned = async () => {
    const currentConversation = await ctx.runQuery(
      internal.chat.inbox.internalGetConversation,
      { conversationId: conversation._id },
    );
    return currentConversation?.assignToAiAgent === true;
  };
  const options = {
    allowHumanAgentTag: args.allowHumanAgentTag ?? false,
    isAiGenerated: true,
    whatsappCustomer: customer ?? undefined,
  };
  const content = normalizeCustomerFacingResponseFormatting(args.content);
  const mediaItems = args.mediaItems ?? args.mediaUrls.map((url) => ({ url }));
  const mediaExternalIds: string[] = [];
  const takeoverResult: AiReplySendResult = {
    ok: false,
    error: "AI replies are disabled for this conversation",
    policy: "generic",
    mediaExternalIds,
  };

  for (const mediaItem of mediaItems) {
    if (!(await isAiAssigned())) return takeoverResult;
    const result = await sendMediaToChannel(conversation, channel, {
      mediaItems: [mediaItem],
      ...options,
    });
    if (!result.ok) {
      return { ok: false, error: result.error, policy: result.policy, mediaExternalIds };
    }
    mediaExternalIds.push(...(result.externalIds ?? (result.externalId ? [result.externalId] : [])));
  }

  if (content.trim()) {
    if (!(await isAiAssigned())) return takeoverResult;
    const result = await sendTextToChannel(conversation, channel, content, options);
    if (!result.ok) {
      return { ok: false, error: result.error, policy: result.policy, mediaExternalIds };
    }
    return { ok: true, textExternalId: result.externalId, mediaExternalIds };
  }
  if (mediaItems.length > 0) return { ok: true, mediaExternalIds };
  return { ok: false, error: "Nothing to send", policy: "generic" };
}
