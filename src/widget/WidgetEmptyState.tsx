import { MessageCircleDashed } from "lucide-react";

export function WidgetEmptyState() {
  return (
    <div className="empty-state full-width full-height">
      <div className="empty-state-header">
        <div className="empty-state-media">
          <MessageCircleDashed size={20} />
        </div>
        <p>How can we help?</p>
        <span>Ask a question to start the conversation.</span>
      </div>
    </div>
  );
}
