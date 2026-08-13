import { Button } from "@/components/ui/button";
import type { GoogleCalendarConnectionStatus } from "./googleCalendarUi";

export const GOOGLE_CALENDAR_ICON_SRC =
  "https://cdn-icons-png.flaticon.com/128/5968/5968499.png";

export type GoogleCalendarConnectionCardProps = GoogleCalendarConnectionStatus & {
  pending?: boolean;
  onConnect: () => void;
  onReconnect: () => void;
  onDisconnect: () => void;
};

function GoogleCalendarIcon() {
  return <img src={GOOGLE_CALENDAR_ICON_SRC} alt="" className="size-4" />;
}

export function GoogleCalendarConnectionCard({
  state,
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
        : "Connect";

  return (
    <div className="flex items-center gap-1.5" data-calendar-header-section="google-calendar">
      {state === "connected" ? (
        <>
          <span className="inline-flex h-8 items-center gap-2 px-1 text-sm text-foreground">
            <GoogleCalendarIcon />
            Connected
          </span>
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
        </>
      ) : (
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
      )}
      {state === "syncing" && lastErrorMessage ? (
        <p className="max-w-40 truncate text-xs text-destructive">{lastErrorMessage}</p>
      ) : null}
    </div>
  );
}
