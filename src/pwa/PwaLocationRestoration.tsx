import { useEffect, useRef } from "react";
import { useConvexAuth, useQuery } from "convex/react";
import { useLocation, useNavigate } from "react-router";
import { api } from "../../convex/_generated/api";
import { useAuth } from "@/partnerAuth/AppAuthProvider";
import { isInstalledApp } from "./installedApp";
import {
  locationKey,
  restorablePath,
  restoreDestination,
} from "./lastLocation";

export function PwaLocationRestoration() {
  const { user, isLoading } = useAuth();
  const auth = useConvexAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const installed = isInstalledApp();
  const ready =
    installed &&
    !isLoading &&
    !auth.isLoading &&
    auth.isAuthenticated &&
    Boolean(user);
  const team = useQuery(api.teams.getActiveTeam, ready ? {} : "skip");
  const agents = useQuery(api.agents.list, ready ? {} : "skip");
  const initial = useRef(
    window.location.pathname + window.location.search + window.location.hash,
  );
  const handled = useRef(false);

  useEffect(() => {
    if (!ready || !user || !team || !agents) return;
    const key = locationKey(user.id, team._id);
    const path = location.pathname + location.search + location.hash;
    if (!handled.current) {
      handled.current = true;
      const pendingPush = sessionStorage.getItem("kilobot-push-return-path");
      if (
        initial.current === "/workspace" &&
        path === "/workspace" &&
        !pendingPush
      ) {
        const saved = localStorage.getItem(key);
        const destination =
          saved &&
          restoreDestination(
            saved,
            agents.map((agent) => agent._id),
          );
        if (destination && destination !== path) {
          navigate(destination, { replace: true });
          return;
        }
        if (saved && !destination) localStorage.removeItem(key);
      }
    }
    if (
      restorablePath(path) &&
      restoreDestination(
        path,
        agents.map((agent) => agent._id),
      )
    )
      localStorage.setItem(key, path);
  }, [ready, user, team, agents, location, navigate]);
  return null;
}
