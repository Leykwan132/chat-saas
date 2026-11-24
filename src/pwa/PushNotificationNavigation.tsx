import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { useConvexAuth } from "convex/react";
import { useAuth } from "@/partnerAuth/AppAuthProvider";

const pendingPushPath = "kilobot-push-return-path";

function validDestination(path: string) {
  const url = new URL(path, window.location.origin);
  return (
    url.origin === window.location.origin &&
    url.pathname.startsWith("/dashboard/")
  );
}

export function PushNotificationNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const { isAuthenticated, isLoading: isConvexLoading } = useConvexAuth();
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    if (query.get("fromPush") === "1") {
      query.delete("fromPush");
      const path = location.pathname + (query.size ? `?${query}` : "");
      if (validDestination(path)) sessionStorage.setItem(pendingPushPath, path);
    }
    if (isLoading || isConvexLoading || !user || !isAuthenticated) return;
    const pending = sessionStorage.getItem(pendingPushPath);
    if (!pending) return;
    sessionStorage.removeItem(pendingPushPath);
    if (validDestination(pending)) navigate(pending, { replace: true });
  }, [
    location.pathname,
    location.search,
    user,
    isLoading,
    isConvexLoading,
    isAuthenticated,
    navigate,
  ]);
  return null;
}
