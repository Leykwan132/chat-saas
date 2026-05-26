import { type ReactNode, useEffect, useRef } from 'react';
import { useAuth } from '@workos-inc/authkit-react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Spinner } from '@/components/ui/spinner';
import { Navigate } from 'react-router';

type RequireOrganizationProps = {
  children: ReactNode;
};

// Gates protected dashboard routes behind the user's onboarding completion state.
// We load the current user's DB row via `api.users.currentUser`. If loading,
// we display a spinner. If the user hasn't completed their onboarding questionnaire
// (role, usecase, plan), we redirect to /onboarding. Once they onboard, they
// are permitted to access their personal workspace or active organization workspace.
export function RequireOrganization({ children }: RequireOrganizationProps) {
  const { isLoading: isAuthLoading, user: authUser } = useAuth();
  const currentUser = useQuery(api.users.currentUser);
  const ensureCurrentUser = useMutation(api.users.ensureCurrentUser);
  const provisioningRef = useRef(false);

  useEffect(() => {
    if (isAuthLoading || authUser === null || currentUser !== null) {
      return;
    }
    if (provisioningRef.current) {
      return;
    }
    provisioningRef.current = true;
    void ensureCurrentUser({}).finally(() => {
      provisioningRef.current = false;
    });
  }, [authUser, currentUser, ensureCurrentUser, isAuthLoading]);

  const isLoading = isAuthLoading || currentUser === undefined;

  if (isLoading) {
    return (
      <div className="flex min-h-[100svh] items-center justify-center bg-background">
        <Spinner className="size-8 text-muted-foreground" />
      </div>
    );
  }

  // If user row is not created yet (e.g. webhook sync delay), show spinner
  if (currentUser === null) {
    return (
      <div className="flex min-h-[100svh] flex-col items-center justify-center gap-4 bg-background">
        <Spinner className="size-8 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">Setting up your profile...</p>
      </div>
    );
  }

  const hasValidPlan =
    currentUser.plan === 'free' ||
    currentUser.stripeSubscriptionStatus === 'active' ||
    currentUser.stripeSubscriptionStatus === 'trialing';

  if (!currentUser.onboarded || !hasValidPlan) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
