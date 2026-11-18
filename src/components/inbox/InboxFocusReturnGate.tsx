import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { readInboxFocusReturnPath } from "@/lib/inboxFocusPath";
import { canAccessOrganization } from "@/lib/organizationAccess";

export function InboxFocusReturnGate({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useConvexAuth();
  const location = useLocation();
  const target = readInboxFocusReturnPath();
  const currentUser = useQuery(
    api.users.currentUser,
    target && isAuthenticated ? {} : "skip",
  );
  const canReturn =
    target &&
    currentUser &&
    !currentUser.needsPersonalWorkspace &&
    canAccessOrganization(currentUser);
  if (
    canReturn &&
    ["/callback", "/workspace", "/onboarding", "/sign-in", "/login"].includes(
      location.pathname,
    )
  ) {
    return <Navigate to={target} replace />;
  }
  return <>{children}</>;
}
