import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useAction } from 'convex/react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/partnerAuth/AppAuthProvider';
import { api } from '../../convex/_generated/api';

export function ResetPasswordPreparingState() {
  return (
    <div
      aria-live="polite"
      className="flex flex-col items-center justify-center gap-3 py-6"
    >
      <Spinner className="size-7 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Preparing session</p>
    </div>
  );
}

export function ResetPasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const startPasswordReset = useAction(
    api.whiteLabel.customerPasswordResetActions.startCurrentUserPasswordReset,
  );
  const confirmPasswordReset = useAction(
    api.whiteLabel.customerPasswordResetActions.confirmPasswordReset,
  );
  const [passwordResetToken, setPasswordResetToken] = useState<string | null>(
    null,
  );
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (open) {
      wasOpenRef.current = true;
      return;
    }
    if (!wasOpenRef.current) {
      return;
    }
    wasOpenRef.current = false;
    setPasswordResetToken(null);
    setPassword('');
    setError(null);
    setIsSubmitting(false);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const result = await startPasswordReset({
          origin: window.location.origin,
        });
        if (!cancelled) {
          setPasswordResetToken(result.passwordResetToken);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof Error
              ? caught.message
              : 'Unable to start password reset.',
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, startPasswordReset]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (passwordResetToken === null) {
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await confirmPasswordReset({
        token: passwordResetToken,
        newPassword: password,
      });
      await signOut({ navigate: false }).catch(() => undefined);
      navigate('/sign-in', { replace: true });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Unable to reset that password.',
      );
      setIsSubmitting(false);
    }
  };

  const showPreparing =
    (passwordResetToken === null && error === null) || isSubmitting;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (isSubmitting) {
          return;
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent showCloseButton={!isSubmitting}>
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription className={showPreparing ? 'sr-only' : undefined}>
            {showPreparing
              ? 'Preparing session'
              : passwordResetToken === null
                ? 'Password reset could not be started.'
                : 'Choose a new password for this account.'}
          </DialogDescription>
        </DialogHeader>
        {showPreparing ? (
          <ResetPasswordPreparingState />
        ) : passwordResetToken === null ? (
          <>
            <p className="text-sm text-muted-foreground">{error}</p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form
            onSubmit={(event) => void handleSubmit(event)}
            className="flex flex-col gap-6"
          >
            <FieldGroup>
              <Field data-invalid={error !== null}>
                <FieldLabel htmlFor="settings-new-password">
                  New password
                </FieldLabel>
                <Input
                  id="settings-new-password"
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
            {error ? <FieldError>{error}</FieldError> : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Save password</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
