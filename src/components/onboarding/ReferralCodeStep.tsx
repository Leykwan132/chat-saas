import { useEffect, useState } from 'react';
import { useQuery } from 'convex/react';
import { ArrowLeft, Check, Gift } from 'lucide-react';
import { motion } from 'motion/react';
import { api } from '../../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldLabel,
} from '@/components/ui/field';
import { InputGroup, InputGroupInput } from '@/components/ui/input-group';
import { Spinner } from '@/components/ui/spinner';
import {
  getReferralCodeInputState,
  normalizeReferralCodeInput,
} from '@/lib/referralCode';

const validationMessages = {
  invalid: 'This referral code was not found.',
  self_referral: 'You cannot use your own referral code.',
  limit_reached: 'This referral code has reached its limit.',
  already_redeemed: 'A referral code has already been used for this account.',
};

export function ReferralCodeStep({
  code,
  onChange,
  onBack,
  onContinue,
  onSkip,
}: {
  code: string;
  onChange: (code: string) => void;
  onBack: () => void;
  onContinue: () => void;
  onSkip: () => void;
}) {
  const [debouncedCode, setDebouncedCode] = useState('');
  const inputState = getReferralCodeInputState(code);
  const config = useQuery(api.referrals.getProgramConfig, {});

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedCode(code), 250);
    return () => window.clearTimeout(timeoutId);
  }, [code]);

  const shouldValidate =
    inputState === 'complete' && debouncedCode === code;
  const validation = useQuery(
    api.referrals.validateCode,
    shouldValidate ? { code: debouncedCode } : 'skip',
  );
  const checking =
    inputState === 'complete' &&
    (debouncedCode !== code || validation === undefined);
  const isValid =
    debouncedCode === code && validation?.status === 'valid';
  const errorMessage =
    inputState === 'invalid'
      ? 'Use a code in the format KILO-XXXXXXXX.'
      : validation && validation.status !== 'valid'
        ? validationMessages[validation.status]
        : null;

  return (
    <motion.form
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={{ duration: 0.22 }}
      className="flex flex-col gap-8"
      onSubmit={(event) => {
        event.preventDefault();
        if (isValid) onContinue();
      }}
    >
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Have a referral code?
        </h1>
        <p className="text-sm text-muted-foreground">
          {config
            ? `You and the person who shared it each get ${config.rewardCredits.toLocaleString()} credits.`
            : 'Enter it now and you can both earn free credits.'}
        </p>
      </div>
      <Field data-invalid={Boolean(errorMessage)}>
        <FieldLabel htmlFor="referral-code">Referral code</FieldLabel>
        <InputGroup className="h-11">
          <InputGroupInput
            id="referral-code"
            value={code}
            maxLength={13}
            autoComplete="off"
            placeholder="KILO-XXXXXXXX"
            aria-invalid={Boolean(errorMessage)}
            onChange={(event) =>
              onChange(normalizeReferralCodeInput(event.target.value))
            }
          />
          {checking ? <Spinner className="mr-3 size-4" /> : null}
          {isValid ? <Check className="mr-3 size-4 text-primary" /> : null}
        </InputGroup>
        <FieldDescription>
          {errorMessage ??
            (isValid
              ? `${validation.rewardCredits.toLocaleString()} credits will be added after onboarding.`
              : 'Codes are 13 characters and start with KILO-.')}
        </FieldDescription>
      </Field>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="outline" onClick={onBack}>
          <ArrowLeft />
          Back
        </Button>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" onClick={onSkip}>
            Skip
          </Button>
          <Button type="submit" disabled={!isValid || checking}>
            <Gift />
            Apply code
          </Button>
        </div>
      </div>
    </motion.form>
  );
}
