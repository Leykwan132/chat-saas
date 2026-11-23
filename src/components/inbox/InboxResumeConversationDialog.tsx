import type { Id } from "../../../convex/_generated/dataModel";
import { InboxAiReplyTimingDialog } from "./InboxAiReplyTimingDialog";

export function InboxResumeConversationDialog(props: {
  conversationId: Id<"conversations">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return <InboxAiReplyTimingDialog {...props} />;
}
