import type { ReactNode } from 'react';
import { Navigate, useParams } from 'react-router';
import { AvatarUnavailableState } from '@/components/avatar/AvatarUnavailableState';
import { Spinner } from '@/components/ui/spinner';
import {
  isProductFeatureEnabled,
  useEnableAvatarFeature,
} from '@/lib/posthogFeatureFlags';
import AvatarCreatePage from '@/pages/AvatarCreatePage';
import AvatarEmbedPage from '@/pages/AvatarEmbedPage';
import AvatarPage from '@/pages/AvatarPage';

function AvatarFlagLoadingState() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Spinner className="size-6 text-muted-foreground" />
    </div>
  );
}

function AvatarDashboardFeatureRoute({ children }: { children: ReactNode }) {
  const { agentId } = useParams();
  const avatarFeatureState = useEnableAvatarFeature();

  if (avatarFeatureState === undefined) return <AvatarFlagLoadingState />;
  if (!isProductFeatureEnabled(avatarFeatureState)) {
    return <Navigate to={`/dashboard/${agentId}/inbox`} replace />;
  }
  return children;
}

export function AvatarOverviewFeatureRoute() {
  return (
    <AvatarDashboardFeatureRoute>
      <AvatarPage />
    </AvatarDashboardFeatureRoute>
  );
}

export function AvatarCreateFeatureRoute() {
  return (
    <AvatarDashboardFeatureRoute>
      <AvatarCreatePage />
    </AvatarDashboardFeatureRoute>
  );
}

export function AvatarEmbedFeatureRoute() {
  const avatarFeatureState = useEnableAvatarFeature();

  if (avatarFeatureState === undefined) return <AvatarFlagLoadingState />;
  if (!isProductFeatureEnabled(avatarFeatureState)) {
    return <AvatarUnavailableState />;
  }
  return <AvatarEmbedPage />;
}
