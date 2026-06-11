export const INBOX_REACTION_EMOJIS = ["👍", "❤️", "🙏", "✅", "🤝"] as const;

export type InboxReactionEmoji = (typeof INBOX_REACTION_EMOJIS)[number];

export type InboxReactionSource = "customer" | "human" | "ai";

export type InboxMessageReaction = {
  emoji: string;
  source: InboxReactionSource;
  actorKey: string;
  actorUserId?: string;
  actorAgentId?: string;
  actorName?: string;
  externalReactionMessageId?: string;
  createdAt: number;
  updatedAt: number;
};

export const MAX_REACTIONS_PER_MESSAGE = 12;

export function isAllowedInboxReactionEmoji(
  emoji: string,
): emoji is InboxReactionEmoji {
  return (INBOX_REACTION_EMOJIS as readonly string[]).includes(emoji);
}
