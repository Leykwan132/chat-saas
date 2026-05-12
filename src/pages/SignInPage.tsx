import { useEffect } from 'react';
import { useAuth } from '@workos-inc/authkit-react';
import { Spinner } from '@/components/ui/spinner';
import { POST_LOGIN_REDIRECT } from '@/constants';

/** Sends the user straight to WorkOS (AuthKit). Kept for `/sign-in` deep links. */
export default function SignInPage() {
  const { signIn } = useAuth();

  useEffect(() => {
    void signIn({ state: { returnTo: POST_LOGIN_REDIRECT } });
  }, [signIn]);

  return (
    <div className="flex min-h-[100svh] items-center justify-center bg-[#050505]">
      <Spinner className="h-8 w-8 text-zinc-500" />
    </div>
  );
}
