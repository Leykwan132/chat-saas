export type MessengerCommentEvent = {
  pageId: string;
  externalCommentId: string;
  authorAddress: string;
  authorName?: string;
  text?: string;
  timestampMs: number;
};

export function parseMessengerCommentEvent(
  pageId: string | undefined,
  change: { field?: string; value?: unknown },
): MessengerCommentEvent | undefined {
  if (!pageId || change.field !== "feed") return undefined;
  if (change.value === null || typeof change.value !== "object") return undefined;

  const value = change.value as Record<string, unknown>;
  if (value.item !== "comment" || value.verb !== "add") return undefined;
  if (typeof value.comment_id !== "string") return undefined;

  const from =
    value.from !== null && typeof value.from === "object"
      ? value.from as Record<string, unknown>
      : undefined;
  if (typeof from?.id !== "string" || from.id === pageId) return undefined;

  const createdAtSeconds =
    typeof value.created_time === "number"
      ? value.created_time
      : Number(value.created_time);
  if (!Number.isFinite(createdAtSeconds)) return undefined;

  return {
    pageId,
    externalCommentId: value.comment_id,
    authorAddress: from.id,
    authorName: typeof from.name === "string" ? from.name : undefined,
    text: typeof value.message === "string" ? value.message : undefined,
    timestampMs:
      createdAtSeconds < 1_000_000_000_000
        ? createdAtSeconds * 1000
        : createdAtSeconds,
  };
}
