import { Navigate, useParams } from 'react-router';
import { Spinner } from '@/components/ui/spinner';
import {
  isProductFeatureEnabled,
  useShowSavedReplies,
} from '@/lib/posthogFeatureFlags';
import QuickRepliesPage from '@/pages/QuickRepliesPage';

export function QuickRepliesFeatureRoute() {
  const { agentId } = useParams();
  const savedRepliesState = useShowSavedReplies();

  if (savedRepliesState === undefined) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner className="size-6 text-muted-foreground" />
      </div>
    );
  }

  if (!isProductFeatureEnabled(savedRepliesState)) {
    return <Navigate to={`/dashboard/${agentId}/inbox`} replace />;
  }

  return <QuickRepliesPage />;
}
