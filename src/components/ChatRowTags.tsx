import { AlertCircle } from "lucide-react";
import {
  isLeadTemperatureTag,
  getLeadTemperatureStyle,
} from "@/lib/leadTemperature";
import { cn } from "@/lib/utils";
import { BookedListLabel } from "@/components/booking/BookingDetailsPanel";
import { AvatarConversationTag } from "@/components/inbox/AvatarConversationTag";
import type { Chat } from "./ChatRow";

function getTagColorClass(): { bg: string; text: string; dot: string } {
  return {
    bg: "bg-zinc-100 dark:bg-zinc-800/80 border-zinc-200/80 dark:border-zinc-700/60 shadow-none",
    text: "text-zinc-600 dark:text-zinc-400",
    dot: "bg-zinc-400 dark:bg-zinc-500",
  };
}

export function ChatRowTags({ chat }: { chat: Chat }) {
  return (
    <>
      {(chat.platform === "avatar" ||
        chat.leadTemperature ||
        (chat.tags && chat.tags.length > 0) ||
        (chat.isEscalated && !chat.handling) ||
        chat.hasBooking) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            marginTop: "6px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
            {chat.hasBooking ? <BookedListLabel /> : null}
            {chat.platform === "avatar" ? (
              <AvatarConversationTag compact />
            ) : null}
            {chat.isEscalated && !chat.handling && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/40 px-1.5 py-0.2 text-[10px] font-semibold text-amber-700 dark:text-amber-400 transition-all shadow-none">
                <AlertCircle className="size-2.5 shrink-0 text-amber-500" />
                <span
                  className="max-w-[70px] truncate"
                  title="Escalated to human"
                >
                  Escalated
                </span>
              </span>
            )}
            {chat.leadTemperature &&
              (() => {
                const style = getLeadTemperatureStyle(chat.leadTemperature);
                const Icon = style.icon;
                return (
                  <span
                    key={chat.leadTemperature}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.2 text-[10px] font-medium transition-all shadow-none",
                      style.bg,
                      style.text,
                    )}
                  >
                    <Icon
                      className={cn("size-2.5 shrink-0", style.iconClass)}
                    />
                    <span
                      className="max-w-[70px] truncate"
                      title={chat.leadTemperature}
                    >
                      {chat.leadTemperature}
                    </span>
                  </span>
                );
              })()}
            {chat.tags &&
              chat.tags
                .filter((tag: string) => !isLeadTemperatureTag(tag))
                .map((tag: string) => {
                  const colors = getTagColorClass();
                  return (
                    <span
                      key={tag}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.2 text-[10px] font-medium transition-all shadow-none",
                        colors.bg,
                        colors.text,
                      )}
                    >
                      <span
                        className={cn(
                          "size-1 rounded-full shrink-0",
                          colors.dot,
                        )}
                      />
                      <span className="max-w-[70px] truncate" title={tag}>
                        {tag}
                      </span>
                    </span>
                  );
                })}
          </div>
        </div>
      )}
    </>
  );
}
