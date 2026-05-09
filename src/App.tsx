import { useAuth } from '@workos-inc/authkit-react';
import { Authenticated, Unauthenticated, AuthLoading } from 'convex/react';
import { Navigate } from 'react-router';
import { Sparkles } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { POST_LOGIN_REDIRECT } from '@/main';

function SignInCard() {
  const { user, signIn, signUp } = useAuth();

  console.log('user', user);

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

export default function App() {
  return (
    <>
      <AuthLoading>
        <div className="flex items-center justify-center min-h-[100svh] bg-background">
          <Spinner className="w-8 h-8 text-muted-foreground" />
        </div>
      </AuthLoading>

      <Unauthenticated>
        <SignInCard />
      </Unauthenticated>

      <Authenticated>
        <Navigate to={POST_LOGIN_REDIRECT} replace />
      </Authenticated>
    </>
  );
}
