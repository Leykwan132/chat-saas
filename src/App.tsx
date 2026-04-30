import { SignIn } from '@clerk/react';
import { Authenticated, Unauthenticated, AuthLoading } from 'convex/react';
import { Navigate } from 'react-router';
import { Loader2 } from 'lucide-react';

export default function App() {
  return (
    <>
      <AuthLoading>
        <div className="flex items-center justify-center min-h-[100svh] bg-background">
          <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
        </div>
      </AuthLoading>

      <Unauthenticated>
        <div className="flex items-center justify-center min-h-[100svh] bg-background">
          <SignIn />
        </div>
      </Unauthenticated>

      <Authenticated>
        <Navigate to="/dashboard" replace />
      </Authenticated>
    </>
  );
}
