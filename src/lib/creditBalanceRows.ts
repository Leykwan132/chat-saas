export type CreditBalanceRow = {
  key: 'plan' | 'additional' | 'referral';
  label: 'Plan' | 'Additional' | 'Referral';
  remaining: number;
  granted: number;
};

type CreditBalanceInput = {
  monthlyRemaining: number;
  monthlyGranted: number;
  additionalRemaining: number;
  additionalGranted: number;
  referralRemaining: number;
  referralGranted: number;
};

export function buildCreditBalanceRows(
  input: CreditBalanceInput,
): CreditBalanceRow[] {
  const rows: CreditBalanceRow[] = [
    {
      key: 'plan',
      label: 'Plan',
      remaining: input.monthlyRemaining,
      granted: input.monthlyGranted,
    },
  ];
  if (input.additionalRemaining > 0) {
    rows.push({
      key: 'additional',
      label: 'Additional',
      remaining: input.additionalRemaining,
      granted: input.additionalGranted,
    });
  }
  if (input.referralRemaining > 0) {
    rows.push({
      key: 'referral',
      label: 'Referral',
      remaining: input.referralRemaining,
      granted: input.referralGranted,
    });
  }
  return rows;
}
