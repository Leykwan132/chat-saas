import { useAuth } from '@/partnerAuth/AppAuthProvider';
import { Navigate } from 'react-router';
import { CreateAgentWizard } from '@/components/create-agent/CreateAgentWizard';
import { RequireOrganization } from '@/components/RequireOrganization';
import { Spinner } from '@/components/ui/spinner';

export default function CreateAgentPage() {
  const { isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-[100svh] items-center justify-center bg-background">
        <Spinner className="size-8 text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return (
    <RequireOrganization>
      <CreateAgentWizard />
    </RequireOrganization>
  );
}
