type ReplyRow = { lastReplyAuthor?: { kind: string } | null };

export function matchesInboxLastReply(row: ReplyRow, lastRepliedByAi: boolean) {
  return !lastRepliedByAi || row.lastReplyAuthor?.kind === "ai";
}
