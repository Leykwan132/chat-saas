import { useEffect, useState, type FormEvent } from 'react';
import { useAction, useQuery } from 'convex/react';
import { useNavigate } from 'react-router';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/partnerAuth/AppAuthProvider';
import { api } from '../../convex/_generated/api';

type PartnerBranding = {
  hostname: string;
  partnerName: string;
  logoUrl: string | null;
};

function KilobotSignIn() {
  const { signIn } = useAuth();

  useEffect(() => {
    void signIn({ state: { returnTo: '/workspace' } });
  }, [signIn]);

  return (
    <div className="flex min-h-[100svh] items-center justify-center bg-background text-foreground">
      <Spinner className="h-8 w-8 text-zinc-500" />
    </div>
  );
}

function PartnerSignIn() {
  const { completePartnerSignIn } = useAuth();
  const navigate = useNavigate();
  const branding = useQuery(api.whiteLabel.partnerAuthGateway.getBrandingForHostname, {
    hostname: window.location.hostname,
  }) as PartnerBranding | null | undefined;
  const signIn = useAction(api.whiteLabel.partnerAuth.signIn);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const session = await signIn({
        hostname: window.location.hostname,
        email,
        password,
      });
      if (completePartnerSignIn === undefined) {
        throw new Error('Partner authentication is unavailable.');
      }
      completePartnerSignIn(session);
      navigate('/workspace', { replace: true });
    } catch {
      setError('Unable to sign in with those credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (branding === undefined) {
    return (
      <div className="flex min-h-[100svh] items-center justify-center bg-background">
        <Spinner className="size-7 text-muted-foreground" />
      </div>
    );
  }

  if (branding === null) {
    return (
      <div className="flex min-h-[100svh] items-center justify-center bg-background px-6 text-center text-sm text-muted-foreground">
        This partner domain is not ready for sign-in.
      </div>
    );
  }

  return (
    <main className="flex min-h-[100svh] items-center justify-center bg-background px-6 py-10">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6">
        <div className="space-y-3">
          {branding.logoUrl ? (
            <img src={branding.logoUrl} alt={branding.partnerName} className="h-9 max-w-48 object-contain object-left" />
          ) : null}
          <div>
            <h1 className="text-xl font-semibold text-foreground">Sign in to {branding.partnerName}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Use your email and password to continue.</p>
          </div>
        </div>
        <div className="space-y-4">
          <label className="grid gap-2 text-sm font-medium text-foreground">
            Email
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-foreground">
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              required
            />
          </label>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <button
          type="submit"
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:pointer-events-none disabled:opacity-50"
          disabled={isSubmitting}
        >
          {isSubmitting ? <Spinner className="size-4" /> : null}
          Sign in
        </button>
      </form>
    </main>
  );
}

export default function SignInPage() {
  const { surface } = useAuth();
  return surface === 'partner' ? <PartnerSignIn /> : <KilobotSignIn />;
}
