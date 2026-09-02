import { type ReactNode, useEffect, useRef } from 'react';
import { useAuth } from '@/partnerAuth/AppAuthProvider';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Spinner } from '@/components/ui/spinner';
import { Navigate } from 'react-router';
import { getClientTimeZone } from '@/lib/calendarTimeUtils';
import { canAccessOrganization } from '@/lib/organizationAccess';

type RequireOrganizationProps = {
  children: ReactNode;
};

export function RequireOrganization({ children }: RequireOrganizationProps) {
  const { isLoading: isAuthLoading, user: authUser, surface } = useAuth();
  const { isLoading: isConvexAuthLoading, isAuthenticated } = useConvexAuth();
  const currentUser = useQuery(api.users.currentUser);
  const ensureCurrentUser = useMutation(api.users.ensureCurrentUser);
  const provisioningRef = useRef(false);

  useEffect(() => {
    if (
      isAuthLoading ||
      isConvexAuthLoading ||
      !isAuthenticated ||
      authUser === null ||
      currentUser !== null
    ) {
      return;
    }
    if (provisioningRef.current) {
      return;
    }
    provisioningRef.current = true;
    void ensureCurrentUser({ timeZone: getClientTimeZone() }).finally(() => {
      provisioningRef.current = false;
    });
  }, [
    authUser,
    currentUser,
    ensureCurrentUser,
    isAuthLoading,
    isAuthenticated,
    isConvexAuthLoading,
  ]);

  if (isAuthLoading || isConvexAuthLoading || currentUser === undefined) {
    return (
      <div className="flex min-h-[100svh] items-center justify-center bg-background">
        <Spinner className="size-8 text-muted-foreground" />
      </div>
    );
  }

  if (!authUser || !isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (currentUser === null) {
    return (
      <div className="flex min-h-[100svh] flex-col items-center justify-center gap-4 bg-background">
        <Spinner className="size-8 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">Setting up your profile...</p>
      </div>
    );
  }

  if (surface === 'kilobot' && !canAccessOrganization(currentUser)) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
