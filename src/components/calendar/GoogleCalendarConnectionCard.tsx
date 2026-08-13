import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import type { GoogleCalendarConnectionStatus } from "./googleCalendarUi";

export const GOOGLE_CALENDAR_ICON_SRC =
  "https://cdn-icons-png.flaticon.com/128/5968/5968499.png";

export type GoogleCalendarConnectionCardProps = GoogleCalendarConnectionStatus & {
  pending?: boolean;
  onConnect: () => void;
  onReconnect: () => void;
  onRefresh: () => void;
  onDisconnect: () => void;
};

function GoogleCalendarIcon() {
  return <img src={GOOGLE_CALENDAR_ICON_SRC} alt="" className="size-4" />;
}

export function GoogleCalendarConnectionCard({
  state,
  lastSuccessfulSyncAt,
  lastErrorMessage,
  pending = false,
  onConnect,
  onReconnect,
  onRefresh,
  onDisconnect,
}: GoogleCalendarConnectionCardProps) {
  const connectLabel =
    pending || state === "syncing"
      ? "Connecting..."
      : state === "needs_reauthorization"
        ? "Reconnect"
        : "Connect";

  return (
    <div className="px-4 pb-3 pt-1" data-calendar-sidebar-section="google-calendar">
      {state === "connected" ? (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 items-center gap-2 text-sm text-foreground">
              <GoogleCalendarIcon />
              Connected
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8"
              disabled={pending}
              onClick={onRefresh}
            >
              Refresh
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8"
              disabled={pending}
              onClick={onDisconnect}
            >
              Disconnect
            </Button>
          </div>
          {lastSuccessfulSyncAt !== undefined ? (
            <p className="px-1 text-xs text-muted-foreground">
              Last synced {formatDistanceToNow(lastSuccessfulSyncAt, { addSuffix: true })}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 w-fit gap-2"
            disabled={pending}
            onClick={state === "needs_reauthorization" ? onReconnect : onConnect}
          >
            <GoogleCalendarIcon />
            {connectLabel}
          </Button>
          {state === "syncing" && lastErrorMessage ? (
            <p className="px-1 text-xs text-destructive">{lastErrorMessage}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
