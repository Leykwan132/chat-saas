import type { Doc } from "./_generated/dataModel";

type Conversation = Doc<"conversations">;
type Timer = Doc<"autoDeescalationTimers">;

export function autoResumeConfig(
  agent: Doc<"agents"> | null,
  scope: Timer["scope"],
) {
  return scope === "normal" ? agent?.autoResume : agent?.autoDeescalation;
}

export function ownsAutoResumeTimer(timer: Timer, conversation: Conversation) {
  if (
    conversation.status === "closed" ||
    conversation.assignedAgentId !== timer.agentId ||
    conversation.assignedUserId !== timer.assignedUserId
  )
    return false;
  if (timer.scope === "normal") return conversation.escalation === undefined;
  return (
    timer.escalatedAt !== undefined &&
    conversation.escalation?.escalatedAt === timer.escalatedAt &&
    conversation.escalation?.sourceMessageId === timer.sourceMessageId
  );
}
