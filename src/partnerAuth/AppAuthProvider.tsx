import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useAuth as useWorkosAuth } from "@workos-inc/authkit-react";

export type AppAuthUser = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profilePictureUrl: string | null;
};

export type AppAuthContextValue = {
  isLoading: boolean;
  user: AppAuthUser | null;
  surface: "kilobot" | "partner";
  getAccessToken(options?: { forceRefresh?: boolean }): Promise<string | null>;
  signIn(options?: { state?: { returnTo?: string } }): Promise<void>;
  signUp(options?: { state?: { returnTo?: string } }): Promise<void>;
  signOut(options?: { returnTo?: string; navigate?: boolean }): Promise<void>;
  switchToOrganization(options: { organizationId: string }): Promise<void>;
  completePartnerSignIn?(input: { token: string; user: AppAuthUser }): void;
};

const AppAuthContext = createContext<AppAuthContextValue | null>(null);

export function useAuth() {
  const value = useContext(AppAuthContext);
  if (value === null) throw new Error("useAuth must be used within an AppAuthProvider.");
  return value;
}

export function NativeAppAuthProvider({ children }: { children: ReactNode }) {
  const workosAuth = useWorkosAuth();
  const value = useMemo<AppAuthContextValue>(() => ({
    isLoading: workosAuth.isLoading,
    user: workosAuth.user,
    surface: "kilobot",
    getAccessToken: async (options) => await workosAuth.getAccessToken(options),
    signIn: async (options) => await workosAuth.signIn(options),
    signUp: async (options) => await workosAuth.signUp(options),
    signOut: async (options) => {
      const result = workosAuth.signOut({
        returnTo: options?.returnTo,
        navigate: options?.navigate ?? false,
      });
      await result;
    },
    switchToOrganization: async (options) => await workosAuth.switchToOrganization(options),
  }), [workosAuth]);

  return <AppAuthContext.Provider value={value}>{children}</AppAuthContext.Provider>;
}

export function AppAuthProvider({
  value,
  children,
}: {
  value: AppAuthContextValue;
  children: ReactNode;
}) {
  return <AppAuthContext.Provider value={value}>{children}</AppAuthContext.Provider>;
}
