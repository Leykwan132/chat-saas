import type { ReactNode } from 'react';
import { useAuth } from '@workos-inc/authkit-react';
import { Spinner } from '@/components/ui/spinner';
import { OrganizationOnboarding } from '@/components/OrganizationOnboarding';

type RequireOrganizationProps = {
  children: ReactNode;
};

// Gates protected dashboard routes behind an active WorkOS organization.
// AuthKit puts the active org in the access token's `org_id` claim, which is
// surfaced as `organizationId` from `useAuth`. Users who just signed up have
// no membership yet (organizationId === null), so we render the onboarding
// instead of the protected page. Once the user creates an org and AuthKit
// mints a fresh token via `switchToOrganization`, this component re-renders
// with `organizationId` populated and falls through to children.
export function RequireOrganization({ children }: RequireOrganizationProps) {
  const { isLoading, organizationId } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-[100svh] items-center justify-center bg-background">
        <Spinner className="size-8 text-muted-foreground" />
      </div>
    );
  }

  if (!organizationId) {
    return <OrganizationOnboarding />;
  }

  return <>{children}</>;
}
