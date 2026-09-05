export type CommentAutomationTrigger = "any_comment" | "keywords";

export function matchesCommentAutomation({
  trigger,
  keywords,
  commentText,
}: {
  trigger: CommentAutomationTrigger;
  keywords: string[];
  commentText: string;
}) {
  if (trigger === "any_comment") return true;
  const normalizedComment = commentText.trim().toLocaleLowerCase();
  return keywords.some((keyword) => {
    const normalizedKeyword = keyword.trim().toLocaleLowerCase();
    return normalizedKeyword.length > 0 && normalizedComment.includes(normalizedKeyword);
  });
}
