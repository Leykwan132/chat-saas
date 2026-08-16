import { useCallback, useEffect, useRef, useState } from "react";
import { useAction, useQuery } from "convex/react";
import { toast } from "sonner";
import { googleCalendarApi } from "./googleCalendarApi";
import type { GoogleCalendarConnectionStatus } from "./googleCalendarUi";

const GOOGLE_CALENDAR_CONNECT_FLAG = "kilobot.googleCalendar.connect";
const CONNECT_POLL_MS = 1500;
const CONNECT_TIMEOUT_MS = 120_000;
const REDIRECT_CONNECT_TIMEOUT_MS = 20_000;

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function reconcileUntilGoogleCalendarReady(
  reconcile: (args: { requireWorkosAccount?: boolean }) => Promise<GoogleCalendarConnectionStatus>,
  options: { shouldStop?: () => boolean; timeoutMs?: number; pollMs?: number } = {},
): Promise<GoogleCalendarConnectionStatus> {
  const deadline = Date.now() + (options.timeoutMs ?? CONNECT_TIMEOUT_MS);
  const pollMs = options.pollMs ?? CONNECT_POLL_MS;
  while (Date.now() < deadline) {
    const status = await reconcile({});
    if (status.state === "connected" || status.state === "syncing") return status;
    if (options.shouldStop?.()) break;
    await sleep(pollMs);
  }
  const status = await reconcile({ requireWorkosAccount: true });
  if (status.state === "connected" || status.state === "syncing") return status;
  if (status.state === "needs_reauthorization") {
    throw new Error("Google Calendar needs to be reconnected.");
  }
  throw new Error("Google Calendar is not connected yet.");
}

export function useGoogleCalendarConnection() {
  const status = useQuery(googleCalendarApi.connectionQueries.getCurrentConnectionStatus) as
    | GoogleCalendarConnectionStatus
    | undefined;
  const reconcile = useAction(googleCalendarApi.connectionActions.reconcileCurrentConnection);
  const refresh = useAction(googleCalendarApi.connectionActions.refreshCurrentConnection);
  const disconnect = useAction(googleCalendarApi.connectionActions.disconnectCurrentConnection);
  const getAuthorizeUrl = useAction(googleCalendarApi.connectionActions.getCurrentAuthorizeUrl);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);

  const run = useCallback(async (operation: () => Promise<unknown>, failureMessage: string) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    try {
      await operation();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : failureMessage);
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }, []);

  const refreshConnection = useCallback(() => {
    return run(() => refresh({}), "Could not refresh Google Calendar");
  }, [refresh, run]);

  const disconnectConnection = useCallback(async () => {
    await run(() => disconnect({}), "Could not disconnect Google Calendar");
    setDisconnectOpen(false);
  }, [disconnect, run]);

  const connectGoogleCalendar = useCallback(() => {
    return run(async () => {
      const { url } = await getAuthorizeUrl({});
      const popup = window.open(url, "google-calendar-connect", "popup=yes,width=520,height=720");
      if (!popup) {
        sessionStorage.setItem(GOOGLE_CALENDAR_CONNECT_FLAG, "1");
        window.location.assign(url);
        return;
      }
      const nextStatus = await reconcileUntilGoogleCalendarReady(reconcile, {
        shouldStop: () => popup.closed,
      });
      popup.close();
      if (nextStatus.state === "connected" || nextStatus.state === "syncing") {
        toast.success("Google Calendar connected");
      }
    }, "Could not connect Google Calendar");
  }, [getAuthorizeUrl, reconcile, run]);

  useEffect(() => {
    if (status?.state === "connected") {
      void refreshConnection();
    }
  }, [refreshConnection, status?.state]);

  useEffect(() => {
    if (sessionStorage.getItem(GOOGLE_CALENDAR_CONNECT_FLAG) !== "1") return;
    sessionStorage.removeItem(GOOGLE_CALENDAR_CONNECT_FLAG);
    void run(async () => {
      const nextStatus = await reconcileUntilGoogleCalendarReady(reconcile, {
        timeoutMs: REDIRECT_CONNECT_TIMEOUT_MS,
      });
      if (nextStatus.state === "connected" || nextStatus.state === "syncing") {
        toast.success("Google Calendar connected");
      }
    }, "Could not connect Google Calendar");
  }, [reconcile, run]);

  return {
    status,
    pending,
    disconnectOpen,
    setDisconnectOpen,
    connectGoogleCalendar,
    refreshConnection,
    disconnectConnection,
  };
}
