import { Navigate } from 'react-router';
import { Spinner } from '@/components/ui/spinner';
import {
  isProductFeatureEnabled,
  useEnableReferralProgram,
} from '@/lib/posthogFeatureFlags';
import ReferralsPage from '@/pages/ReferralsPage';

export function ReferralFeatureRoute() {
  const referralProgramState = useEnableReferralProgram();

  if (referralProgramState === undefined) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner className="size-6 text-muted-foreground" />
      </div>
    );
  }
  if (!isProductFeatureEnabled(referralProgramState)) {
    return <Navigate to="/workspace" replace />;
  }
  return <ReferralsPage />;
}
