export function messengerCommentOutboundLog(change: {
  field?: string;
  value?: unknown;
}) {
  if (change.value === null || typeof change.value !== "object") return undefined;
  const value = change.value as Record<string, unknown>;
  const commentId = value.comment_id ?? value.commentId;
  const isComment =
    change.field === "comments" ||
    value.item === "comment" ||
    typeof commentId === "string";
  if (!isComment) return undefined;
  return {
    field: change.field,
    item: value.item,
    verb: value.verb,
    commentId,
    postId: value.post_id ?? value.postId,
    parentId: value.parent_id,
    message: value.message,
    from: value.from,
    publicReply: "not-sent",
    privateMessage: "not-sent",
  };
}
