import { clearLastLocations } from "@/pwa/lastLocation";
import { detachPushDevice } from "@/pwa/detachPushDevice";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AppAuthProvider, type AppAuthUser } from "./AppAuthProvider";
import {
  clearPartnerSession,
  loadPartnerSession,
  savePartnerSession,
} from "./partnerSessionStorage";

type PartnerAuthState = {
  token: string | null;
  user: AppAuthUser | null;
};

export function PartnerAuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PartnerAuthState>(() => {
    const storedSession = loadPartnerSession();
    return storedSession?.session ?? { token: null, user: null };
  });

  useEffect(() => {
    const storedSession = loadPartnerSession();
    if (storedSession === null) return;
    const timeout = window.setTimeout(() => {
      clearPartnerSession();
      setState({ token: null, user: null });
      window.location.assign("/sign-in");
    }, storedSession.expiresAt - Date.now());
    return () => window.clearTimeout(timeout);
  }, [state.token]);

  const signOut = useCallback(async () => {
    clearLastLocations();
    await detachPushDevice(async () => state.token);
    clearPartnerSession();
    setState({ token: null, user: null });
  }, [state.token]);

  const completePartnerSignIn = useCallback(
    (input: { token: string; user: AppAuthUser }) => {
      savePartnerSession(input);
      setState(input);
    },
    [],
  );

  const value = useMemo(
    () => ({
      isLoading: false,
      user: state.user,
      surface: "partner" as const,
      getAccessToken: async () => state.token,
      signIn: async () => {
        window.location.assign("/sign-in");
      },
      signUp: async () => {
        window.location.assign("/sign-in");
      },
      signOut,
      completePartnerSignIn,
      switchToOrganization: async () => {
        throw new Error("Partner workspace switching is unavailable.");
      },
    }),
    [completePartnerSignIn, signOut, state],
  );

  return <AppAuthProvider value={value}>{children}</AppAuthProvider>;
}
