import type { ReactNode } from "react";
import { useConvexAuth, useQuery } from "convex/react";
import { makeFunctionReference } from "convex/server";
import { Navigate, useLocation } from "react-router";
import { api } from "../../../convex/_generated/api";
import { canAccessOrganization } from "@/lib/organizationAccess";
import { Spinner } from "@/components/ui/spinner";

const currentMode = makeFunctionReference<
  "query",
  Record<string, never>,
  {
    interfaceMode: "normal" | "focus";
    managed: boolean;
    agentId: string | null;
  }
>("whiteLabel/customerInterfaceMode:current");

export function PartnerInterfaceModeGate({
  children,
}: {
  children: ReactNode;
}) {
  const { isAuthenticated } = useConvexAuth();
  const location = useLocation();
  const user = useQuery(api.users.currentUser, isAuthenticated ? {} : "skip");
  const ready =
    user && !user.needsPersonalWorkspace && canAccessOrganization(user);
  const mode = useQuery(currentMode, ready ? {} : "skip");
  const appPath =
    location.pathname === "/" ||
    location.pathname === "/workspace" ||
    location.pathname.startsWith("/dashboard");
  if (ready && appPath && mode === undefined)
    return <Spinner className="size-6" />;
  if (
    mode?.managed &&
    mode.interfaceMode === "normal" &&
    /^\/dashboard\/[^/]+\/inbox\/focus$/.test(location.pathname)
  ) {
    return <Navigate to={location.pathname.replace(/\/focus$/, "")} replace />;
  }
  if (mode?.interfaceMode === "focus" && appPath) {
    if (!mode.agentId)
      return (
        <div className="flex min-h-screen items-center justify-center p-6 text-sm">
          Your team needs to set up an inbox. Contact your partner
          administrator.
        </div>
      );
    const currentAgent = location.pathname.match(/^\/dashboard\/([^/]+)/)?.[1];
    const target = `/dashboard/${currentAgent ?? mode.agentId}/inbox/focus`;
    if (location.pathname !== target) return <Navigate to={target} replace />;
  }
  return <>{children}</>;
}
