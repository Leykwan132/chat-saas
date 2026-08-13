import { useCallback, useEffect, useRef, useState } from "react";
import { useAction, useQuery } from "convex/react";
import { toast } from "sonner";
import { googleCalendarApi } from "./googleCalendarApi";
import type { GoogleCalendarConnectionStatus } from "./googleCalendarUi";

const GOOGLE_CALENDAR_CONNECT_FLAG = "kilobot.googleCalendar.connect";

function waitForPopupClose(popup: Window) {
  return new Promise<void>((resolve) => {
    const timer = window.setInterval(() => {
      if (!popup.closed) return;
      window.clearInterval(timer);
      resolve();
    }, 400);
  });
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

  const reconcileConnection = useCallback(() => {
    return run(() => reconcile({}), "Could not connect Google Calendar");
  }, [reconcile, run]);

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
      await waitForPopupClose(popup);
      await reconcile({});
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
    void reconcileConnection();
  }, [reconcileConnection]);

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
