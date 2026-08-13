import { BadgeCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatPrefixedRelativeAge } from "@/lib/formatRelativeAge";
import type { GoogleCalendarConnectionStatus } from "./googleCalendarUi";

export const GOOGLE_CALENDAR_ICON_SRC =
  "https://www.gstatic.com/images/branding/productlogos/calendar_2026_13/v2/png/calendar_2026_13_96dp.png";

export type GoogleCalendarConnectionCardProps = GoogleCalendarConnectionStatus & {
  pending?: boolean;
  onConnect: () => void;
  onReconnect: () => void;
  onDisconnect: () => void;
};

function GoogleCalendarIcon() {
  return <img src={GOOGLE_CALENDAR_ICON_SRC} alt="" className="size-4" />;
}

function connectedAgeLabel(createdAt?: number, lastSuccessfulSyncAt?: number) {
  const at = createdAt ?? lastSuccessfulSyncAt;
  if (at === undefined) return undefined;
  return formatPrefixedRelativeAge("Connected", at);
}

export function GoogleCalendarConnectionCard({
  state,
  connectedAccountEmail,
  createdAt,
  lastSuccessfulSyncAt,
  lastErrorMessage,
  pending = false,
  onConnect,
  onReconnect,
  onDisconnect,
}: GoogleCalendarConnectionCardProps) {
  const connectLabel =
    pending || state === "syncing"
      ? "Connecting..."
      : state === "needs_reauthorization"
        ? "Reconnect"
        : "+ Connect";
  const connectedAge = connectedAgeLabel(createdAt, lastSuccessfulSyncAt);

  return (
    <div data-calendar-sidebar-section="google-calendar">
      <div className="flex items-center gap-2 text-sm font-medium">
        <GoogleCalendarIcon />
        Google Calendar
      </div>
      <div className="mt-2">
        {state === "connected" ? (
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="min-w-0 truncate text-sm font-medium">
                  {connectedAccountEmail}
                </span>
                {connectedAccountEmail ? (
                  <BadgeCheck
                    className="size-3.5 shrink-0 fill-green-600 text-white"
                    aria-label="Active"
                  />
                ) : null}
              </div>
              {connectedAge ? (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{connectedAge}</p>
              ) : null}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              disabled={pending}
              aria-label="Disconnect Google Calendar"
              onClick={onDisconnect}
            >
              <Trash2 />
            </Button>
          </div>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-full justify-start px-0"
                disabled={pending}
                onClick={state === "needs_reauthorization" ? onReconnect : onConnect}
              >
                {connectLabel}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {state === "needs_reauthorization"
                ? "Reconnect Google Calendar"
                : "Connect Google Calendar"}
            </TooltipContent>
          </Tooltip>
        )}
        {state === "syncing" && lastErrorMessage ? (
          <p className="mt-2 truncate text-xs text-destructive">{lastErrorMessage}</p>
        ) : null}
      </div>
    </div>
  );
}
