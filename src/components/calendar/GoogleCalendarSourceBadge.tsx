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
  if (origin !== "google") return null;

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
