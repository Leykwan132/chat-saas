export type ReferralProgramConfig = {
  rewardCredits: number;
  maxSuccessfulReferrals: number;
  maximumEarningPotential: number;
};

function parsePositiveSafeInteger(
  environment: Record<string, string | undefined>,
  name: string,
): number {
  const rawValue = environment[name]?.trim();
  if (!rawValue || !/^\d+$/.test(rawValue)) {
    throw new Error(`${name} must be a positive safe integer`);
  }

  const value = Number(rawValue);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive safe integer`);
  }

  return value;
}

export function parseReferralProgramConfig(
  environment: Record<string, string | undefined>,
): ReferralProgramConfig {
  const rewardCredits = parsePositiveSafeInteger(
    environment,
    "REFERRAL_REWARD_CREDITS",
  );
  const maxSuccessfulReferrals = parsePositiveSafeInteger(
    environment,
    "REFERRAL_MAX_SUCCESSFUL_REFERRALS",
  );
  const maximumEarningPotential = rewardCredits * maxSuccessfulReferrals;

  if (!Number.isSafeInteger(maximumEarningPotential)) {
    throw new Error("Referral maximum earning potential must be a safe integer");
  }

  return {
    rewardCredits,
    maxSuccessfulReferrals,
    maximumEarningPotential,
  };
}

export function getReferralProgramConfig(): ReferralProgramConfig {
  return parseReferralProgramConfig(process.env);
}
