import { MessagesSquare } from "lucide-react";

type WidgetChatHeaderProps = {
  displayName: string;
  iconUrl?: string;
};

export function WidgetChatHeader({
  displayName,
  iconUrl,
}: WidgetChatHeaderProps) {
  return (
    <header>
      <div className="orb header-avatar">
        {iconUrl ? (
          <img src={iconUrl} alt="" />
        ) : (
          <MessagesSquare size={16} aria-hidden="true" />
        )}
      </div>
      <div>
        <strong>{displayName}</strong>
      </div>
    </header>
  );
}
