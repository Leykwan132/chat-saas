import type { CommentAutomationTrigger } from "./commentAutomationMatching";

export function normalizeCommentAutomationInput({
  name,
  trigger,
  keywords,
  privateMessage,
  publicReply,
}: {
  name: string;
  trigger: CommentAutomationTrigger;
  keywords: string[];
  privateMessage: string;
  publicReply?: string;
}) {
  const normalizedName = name.trim();
  const normalizedPrivateMessage = privateMessage.trim();
  const normalizedPublicReply = publicReply?.trim() || undefined;
  const normalizedKeywords = [...new Set(
    keywords.map((keyword) => keyword.trim().toLocaleLowerCase()).filter(Boolean),
  )];
  if (!normalizedName) throw new Error("Automation name is required");
  if (!normalizedPrivateMessage) throw new Error("Private message is required");
  if (trigger === "keywords" && normalizedKeywords.length === 0) {
    throw new Error("Add at least one keyword");
  }
  return {
    name: normalizedName,
    trigger,
    keywords: trigger === "keywords" ? normalizedKeywords : [],
    privateMessage: normalizedPrivateMessage,
    publicReply: normalizedPublicReply,
  };
}
