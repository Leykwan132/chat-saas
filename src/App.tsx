import { SignIn } from '@clerk/react';
import { Authenticated, Unauthenticated, AuthLoading } from 'convex/react';
import { Navigate } from 'react-router';
import { Spinner } from '@/components/ui/spinner';

export default function App() {
  return (
    <>
      <AuthLoading>
        <div className="flex items-center justify-center min-h-[100svh] bg-background">
          <Spinner className="w-8 h-8 text-muted-foreground" />
        </div>
      </AuthLoading>

      <Unauthenticated>
        <div className="flex items-center justify-center min-h-[100svh] bg-background">
          <SignIn />
        </div>
      </Unauthenticated>

      <Authenticated>
        <Navigate to="/workspace" replace />
      </Authenticated>
    </>
  );
}
