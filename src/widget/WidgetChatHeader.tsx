import { MessagesSquare, RotateCcw } from "lucide-react";

type WidgetChatHeaderProps = {
  disabled: boolean;
  displayName: string;
  iconUrl?: string;
  onReset: () => void;
};

export function WidgetChatHeader({
  disabled,
  displayName,
  iconUrl,
  onReset,
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
      <button
        className="chat-reset"
        type="button"
        onClick={onReset}
        disabled={disabled}
        aria-label="Reset chat"
        title="Reset chat"
      >
        <RotateCcw size={17} aria-hidden="true" />
      </button>
    </header>
  );
}
