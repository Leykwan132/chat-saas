import { useCallback } from "react";
import { useAuth } from "./AppAuthProvider";

export function usePartnerConvexAuth() {
  const { isLoading, user, getAccessToken } = useAuth();
  const fetchAccessToken = useCallback(
    async () => await getAccessToken(),
    [getAccessToken],
  );
  return {
    isLoading,
    isAuthenticated: user !== null,
    fetchAccessToken,
  };
}
