import type { InboxHandling } from "../../shared/inboxHandling";
import { InboxHandlingBadge } from "@/components/inbox/InboxHandlingBadge";
import { ChatRowTags } from "./ChatRowTags";
import {
  Pin,
  PinOff,
  Image as ImageIcon,
  Volume2,
  Globe,
  ScanFace,
  Trash2,
} from "lucide-react";
import { SiInstagram, SiMessenger, SiWhatsapp } from "react-icons/si";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { getPlatformIconClassName } from "@/lib/platformIconStyles";
import type { Id } from "../../convex/_generated/dataModel";

export type ConversationPlatform =
  | "whatsapp"
  | "instagram"
  | "messenger"
  | "web"
  | "avatar";

export type Chat = {
  id: Id<"conversations">;
  name: string;
  message: string;
  time: string;
  unread: number;
  platform: ConversationPlatform;
  requiresAction: boolean;
  conversationStatus:
    | "open"
    | "snoozed"
    | "closed"
    | "booked"
    | "requires_user_input";
  tags?: string[];
  leadTemperature?: "Hot" | "Warm" | "Cold";
  hasBooking?: boolean;
  isEscalated?: boolean;
  lastMessageSentByAi?: boolean;
  handling?: InboxHandling;
};

function PlatformGlyph({ platform }: { platform: ConversationPlatform }) {
  const common = {
    size: 14,
    style: { flexShrink: 0 } as const,
    className: getPlatformIconClassName(platform),
  };
  switch (platform) {
    case "whatsapp":
      return <SiWhatsapp {...common} title="WhatsApp" />;
    case "instagram":
      return <SiInstagram {...common} title="Instagram" />;
    case "messenger":
      return <SiMessenger {...common} title="Messenger" />;
    case "web":
      return <Globe size={14} className={getPlatformIconClassName(platform)} />;
    case "avatar":
      return (
        <ScanFace size={14} className={getPlatformIconClassName(platform)} />
      );
  }
}

type ChatRowProps = {
  chat: Chat;
  comfortable?: boolean;
  index: number;
  total: number;
  isSelected: boolean;
  isPinned: boolean;
  onSelect: (id: Id<"conversations">) => void;
  onTogglePin: (id: Id<"conversations">) => void;
  onDelete?: (id: Id<"conversations">) => void;
};

export function ChatRow({
  comfortable = false,
  chat,
  index,
  total,
  isSelected,
  isPinned,
  onSelect,
  onTogglePin,
  onDelete,
}: ChatRowProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          role="button"
          tabIndex={0}
          onClick={() => onSelect(chat.id)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onSelect(chat.id);
            }
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: comfortable ? "18px 16px" : "12px 16px",
            borderBottom:
              index !== total - 1 ? "1px solid var(--color-border)" : "none",
            cursor: "pointer",
            transition: "background 0.12s",
            background: isSelected
              ? "var(--color-surface-hover)"
              : "transparent",
            position: "relative",
          }}
          onMouseEnter={(e) =>
            !isSelected &&
            (e.currentTarget.style.background = "var(--color-surface-hover)")
          }
          onMouseLeave={(e) =>
            !isSelected && (e.currentTarget.style.background = "transparent")
          }
        >
          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: comfortable ? "6px" : "2px",
              }}
            >
              <span
                style={{
                  fontSize: comfortable ? "15px" : "13px",
                  fontWeight: 600,
                  color: "var(--color-foreground)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {isPinned && (
                  <Pin
                    size={10}
                    color="var(--color-foreground-subtle)"
                    style={{ flexShrink: 0 }}
                  />
                )}
                <PlatformGlyph platform={chat.platform} />
                <span className="truncate">{chat.name}</span>
                {chat.handling ? (
                  <InboxHandlingBadge handling={chat.handling} />
                ) : null}
              </span>
              <span
                style={{
                  fontSize: "11px",
                  color: "var(--color-foreground-subtle)",
                  flexShrink: 0,
                  marginLeft: "8px",
                }}
              >
                {chat.time}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: comfortable ? "14px" : "12px",
                  lineHeight: comfortable ? "20px" : undefined,
                  color: isSelected
                    ? "var(--color-foreground-muted)"
                    : "var(--color-foreground-muted)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                {(chat.message === "Image" ||
                  chat.message?.toLowerCase() === "image" ||
                  chat.message?.startsWith("<image>")) && (
                  <ImageIcon
                    size={12}
                    className="shrink-0 text-muted-foreground"
                    style={{ display: "inline-block" }}
                  />
                )}
                {(chat.message === "Audio" ||
                  chat.message?.toLowerCase() === "audio" ||
                  chat.message?.startsWith("<audio>")) && (
                  <Volume2
                    size={12}
                    className="shrink-0 text-muted-foreground"
                    style={{ display: "inline-block" }}
                  />
                )}
                {chat.lastMessageSentByAi && !chat.handling ? (
                  <span className="rounded bg-muted px-1 py-0.5 text-[9px] font-semibold text-muted-foreground">
                    AI
                  </span>
                ) : null}
                <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                  {chat.message}
                </span>
              </p>
              {chat.unread > 0 && (
                <span className="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {chat.unread}
                </span>
              )}
            </div>
            <ChatRowTags chat={chat} />
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          onClick={() => onTogglePin(chat.id)}
          style={{ display: "flex", alignItems: "center", gap: "8px" }}
        >
          {isPinned ? <PinOff size={14} /> : <Pin size={14} />}
          {isPinned ? "Unpin" : "Pin"}
        </ContextMenuItem>
        {onDelete ? (
          <ContextMenuItem
            variant="destructive"
            onClick={() => onDelete(chat.id)}
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            <Trash2 size={14} />
            Delete
          </ContextMenuItem>
        ) : null}
      </ContextMenuContent>
    </ContextMenu>
  );
}
