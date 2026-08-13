import { useCallback, useEffect, useRef, useState } from "react";
import { useAction, useQuery } from "convex/react";
import { useAuth } from "@workos-inc/authkit-react";
import { toast } from "sonner";
import { googleCalendarApi } from "./googleCalendarApi";
import type { GoogleCalendarConnectionStatus } from "./googleCalendarUi";

export function useGoogleCalendarConnection() {
  const { getAccessToken } = useAuth();
  const status = useQuery(googleCalendarApi.connectionQueries.getCurrentConnectionStatus) as
    | GoogleCalendarConnectionStatus
    | undefined;
  const reconcile = useAction(googleCalendarApi.connectionActions.reconcileCurrentConnection);
  const refresh = useAction(googleCalendarApi.connectionActions.refreshCurrentConnection);
  const disconnect = useAction(googleCalendarApi.connectionActions.disconnectCurrentConnection);
  const [pipesOpen, setPipesOpen] = useState(false);
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

  const authToken = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) throw new Error("Not authenticated");
    return token;
  }, [getAccessToken]);

  useEffect(() => {
    if (status?.state === "connected") {
      void refreshConnection();
    }
  }, [refreshConnection, status?.state]);

  useEffect(() => {
    if (!pipesOpen) return;
    const onFocus = () => {
      void reconcileConnection();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [pipesOpen, reconcileConnection]);

  const handlePipesOpenChange = (open: boolean) => {
    setPipesOpen(open);
    if (!open) void reconcileConnection();
  };

  return {
    status,
    pending,
    pipesOpen,
    disconnectOpen,
    authToken,
    setDisconnectOpen,
    openPipes: () => setPipesOpen(true),
    handlePipesOpenChange,
    refreshConnection,
    disconnectConnection,
  };
}
