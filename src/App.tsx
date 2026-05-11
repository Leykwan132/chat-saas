import { useAuth } from '@workos-inc/authkit-react';
import { Navigate } from 'react-router';
import { Sparkles } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { POST_LOGIN_REDIRECT } from '@/main';

function SignInCard() {
  const { signIn, signUp } = useAuth();

  return (
    <div className="flex min-h-[100svh] items-center justify-center bg-background px-6">
      <div className="flex w-full max-w-sm flex-col items-center rounded-xl border border-border bg-card px-8 py-10 text-center shadow-sm">
        <div className="mb-5 flex size-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Sparkles className="size-6" />
        </div>
        <h1 className="m-0 text-xl font-semibold tracking-tight">Welcome to ChatSaaS</h1>
        <p className="m-0 mt-2 text-sm text-muted-foreground">
          Sign in to manage your AI agents and team.
        </p>
        <div className="mt-6 flex w-full flex-col gap-2">
          <Button
            type="button"
            size="lg"
            onClick={() => {
              void signIn();
            }}
          >
            Sign in
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => {
              void signUp({ state: { returnTo: POST_LOGIN_REDIRECT } });
            }}
          >
            Create an account
          </Button>
        </div>
      </div>
    </div>
  );
}

// Root route ("/"). Uses WorkOS's isLoading / user directly rather than
// Convex's <Authenticated> wrappers so there is no race between AuthKit
// restoring tokens from storage and Convex's auth context catching up.
// Without this, a brief unauthenticated flash could prevent the redirect.
export default function App() {
  const { isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-[100svh] items-center justify-center bg-background">
        <Spinner className="w-8 h-8 text-muted-foreground" />
      </div>
    );
  }

  if (user) {
    return <Navigate to={POST_LOGIN_REDIRECT} replace />;
  }

  return <SignInCard />;
}
