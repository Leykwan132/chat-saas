import { Navigate } from 'react-router';
import { Spinner } from '@/components/ui/spinner';
import {
  isProductFeatureEnabled,
  useEnablePartnerPortal,
} from '@/lib/posthogFeatureFlags';
import PartnerPage from '@/pages/PartnerPage';

export function PartnerFeatureRoute() {
  const partnerPortalState = useEnablePartnerPortal();

  if (partnerPortalState === undefined) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner className="size-6 text-muted-foreground" />
      </div>
    );
  }
  if (!isProductFeatureEnabled(partnerPortalState)) {
    return <Navigate to="/workspace" replace />;
  }
  return <PartnerPage />;
}
