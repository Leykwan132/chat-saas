import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { GOOGLE_CALENDAR_ICON_SRC } from "./googleCalendarBranding";

export function GoogleCalendarSourceBadge({
  origin,
  size = "compact",
}: {
  origin?: "google" | "kilobot";
  size?: "compact" | "heading";
}) {
  const iconClassName = size === "heading" ? "size-5" : "size-3.5";
  if (origin === "google") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="shrink-0" aria-label="Event synced with Google Calendar">
            <img src={GOOGLE_CALENDAR_ICON_SRC} alt="" className={iconClassName} />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">Event synced with Google Calendar</TooltipContent>
      </Tooltip>
    );
  }
  if (origin !== "kilobot") return null;
  return (
    <span className="shrink-0 rounded bg-muted px-1 py-px text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
      Kilobot
    </span>
  );
}
