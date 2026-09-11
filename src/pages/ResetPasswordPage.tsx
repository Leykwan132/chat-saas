import { useState, type FormEvent } from 'react';
import { useAction, useQuery } from 'convex/react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { ResetPasswordPreparingState } from '@/components/ResetPasswordDialog';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { isNativeHost } from '@/lib/hostBranding';
import { useAuth } from '@/partnerAuth/AppAuthProvider';
import { sanitizePasswordResetReturnPath } from '../../shared/passwordResetReturn';
import { api } from '../../convex/_generated/api';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const token = searchParams.get('token')?.trim() ?? '';
  const returnTo = sanitizePasswordResetReturnPath(
    searchParams.get('returnTo') ?? '/sign-in',
  );
  const hostname = window.location.hostname;
  const native = isNativeHost(hostname);
  const branding = useQuery(
    api.whiteLabel.partnerAuthGateway.getBrandingForHostname,
    { hostname },
  );
  const confirmPasswordReset = useAction(
    api.whiteLabel.customerPasswordResetActions.confirmPasswordReset,
  );
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await confirmPasswordReset({ token, newPassword: password });
      await signOut({ navigate: false }).catch(() => undefined);
      navigate(returnTo, { replace: true });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Unable to reset that password.',
      );
      setIsSubmitting(false);
    }
  };

  if (branding === undefined || isSubmitting) {
    return (
      <div className="flex min-h-[100svh] items-center justify-center bg-background">
        <ResetPasswordPreparingState />
      </div>
    );
  }

  if (!native && branding === null) {
    return (
      <div className="flex min-h-[100svh] items-center justify-center bg-background px-6 text-center text-sm text-muted-foreground">
        This partner domain is not ready for sign-in.
      </div>
    );
  }

  const title = branding?.partnerName
    ? `Reset your ${branding.partnerName} password`
    : 'Set a new password';

  return (
    <main className="flex min-h-[100svh] items-center justify-center bg-background px-6 py-10">
      <form onSubmit={(event) => void handleSubmit(event)} className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col gap-3 text-center">
          {branding?.logoUrl ? (
            <img src={branding.logoUrl} alt={branding.partnerName} className="mx-auto h-9 max-w-48 object-contain" />
          ) : null}
          <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        </div>
        {token ? (
          <FieldGroup>
            <Field data-invalid={error !== null}>
              <FieldLabel htmlFor="new-password">New password</FieldLabel>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={error !== null}
                minLength={8}
                required
              />
            </Field>
          </FieldGroup>
        ) : (
          <p className="text-sm text-muted-foreground">
            This password reset link is missing a token.
          </p>
        )}
        {error ? <FieldError>{error}</FieldError> : null}
        {token ? (
          <Button type="submit">Save password</Button>
        ) : (
          <Button asChild variant="outline">
            <Link to="/sign-in">Back to sign in</Link>
          </Button>
        )}
      </form>
    </main>
  );
}
