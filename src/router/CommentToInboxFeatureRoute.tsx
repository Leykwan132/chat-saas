import { Navigate, useParams } from 'react-router';
import { Spinner } from '@/components/ui/spinner';
import {
  isCommentToInboxUserAllowed,
  isProductFeatureEnabled,
  useEnableCommentToInboxFeature,
} from '@/lib/posthogFeatureFlags';
import { useAuth } from '@/partnerAuth/AppAuthProvider';
import CommentToInboxPage from '@/pages/CommentToInboxPage';

export function CommentToInboxFeatureRoute() {
  const { agentId } = useParams();
  const { user, isLoading: authLoading } = useAuth();
  const featureState = useEnableCommentToInboxFeature();
  if (authLoading || featureState === undefined) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Spinner className="size-6 text-muted-foreground" /></div>;
  }
  if (!isProductFeatureEnabled(featureState) || !isCommentToInboxUserAllowed(user?.email)) {
    return <Navigate to={`/dashboard/${agentId}/inbox`} replace />;
  }
  return <CommentToInboxPage />;
}
