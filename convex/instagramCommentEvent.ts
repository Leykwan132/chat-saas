type InstagramCommentChange = {
  field?: string;
  value?: {
    from?: { id?: string; username?: string };
    id?: string;
    text?: string;
  };
};

export type InstagramCommentEvent = {
  igUserId: string;
  externalCommentId: string;
  authorAddress: string;
  authorName?: string;
  text: string;
  timestampMs: number;
};

export function parseInstagramCommentEvent(
  igUserId: string | undefined,
  entryTimestamp: number | string | undefined,
  change: InstagramCommentChange,
): InstagramCommentEvent | null {
  if (change.field !== "comments" || !igUserId) return null;
  const externalCommentId = change.value?.id;
  const authorAddress = change.value?.from?.id;
  const timestampMs = parseTimestamp(entryTimestamp);
  if (!externalCommentId || !authorAddress || timestampMs === null) return null;
  return {
    igUserId,
    externalCommentId,
    authorAddress,
    authorName: change.value?.from?.username,
    text: change.value?.text ?? "",
    timestampMs,
  };
}

function parseTimestamp(timestamp: number | string | undefined): number | null {
  if (timestamp === undefined) return null;
  const value = Number(timestamp);
  if (!Number.isFinite(value)) return null;
  return value < 1_000_000_000_000 ? value * 1000 : value;
}
