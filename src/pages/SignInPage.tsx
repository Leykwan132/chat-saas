import { useEffect, useState, type FormEvent } from 'react';
import { useAction, useQuery } from 'convex/react';
import { useNavigate } from 'react-router';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/partnerAuth/AppAuthProvider';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

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
  const [organizations, setOrganizations] = useState<Array<{
    id: Id<'whiteLabelPartnerOrganizations'>;
    name: string;
  }>>([]);

  const authenticate = async (
    partnerOrganizationId?: Id<'whiteLabelPartnerOrganizations'>,
  ) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const session = await signIn({
        hostname: window.location.hostname,
        email,
        password,
        partnerOrganizationId,
      });
      if (session.kind === 'organization_choice') {
        setOrganizations(session.organizations);
        return;
      }
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await authenticate();
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
      <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col gap-3 text-center">
          {branding.logoUrl ? (
            <img src={branding.logoUrl} alt={branding.partnerName} className="mx-auto h-9 max-w-48 object-contain" />
          ) : null}
          <h1 className="text-xl font-semibold text-foreground">Sign in to {branding.partnerName}</h1>
        </div>
        {organizations.length === 0 ? (
          <FieldGroup>
            <Field data-invalid={error !== null}>
              <FieldLabel htmlFor="partner-email">Email</FieldLabel>
              <Input
                id="partner-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={error !== null}
                required
              />
            </Field>
            <Field data-invalid={error !== null}>
              <FieldLabel htmlFor="partner-password">Password</FieldLabel>
              <Input
                id="partner-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={error !== null}
                required
              />
            </Field>
          </FieldGroup>
        ) : (
          <FieldSet>
            <FieldLegend>Choose an organization</FieldLegend>
            <FieldGroup>
              {organizations.map((organization) => (
                <Button
                  key={organization.id}
                  type="button"
                  variant="outline"
                  onClick={() => void authenticate(organization.id)}
                  disabled={isSubmitting}
                >
                  {organization.name}
                </Button>
              ))}
              <Button
                type="button"
                variant="ghost"
                disabled={isSubmitting}
                onClick={() => {
                  setOrganizations([]);
                  setError(null);
                }}
              >
                Back
              </Button>
            </FieldGroup>
          </FieldSet>
        )}
        {error ? <FieldError>{error}</FieldError> : null}
        {organizations.length === 0 ? (
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
            Sign in
          </Button>
        ) : null}
      </form>
    </main>
  );
}

export default function SignInPage() {
  const { surface } = useAuth();
  return surface === 'partner' ? <PartnerSignIn /> : <KilobotSignIn />;
}
