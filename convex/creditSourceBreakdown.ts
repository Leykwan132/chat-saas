import type { TopUpEntrySource } from "./creditEntries";

type TopUpEntryForBreakdown = {
  source?: TopUpEntrySource;
  grantedCredits?: number;
  usedCredits?: number;
  amount?: number;
  balance?: number;
};

export type TopUpCreditBreakdown = {
  totalRemaining: number;
  totalGranted: number;
  additionalRemaining: number;
  additionalGranted: number;
  referralRemaining: number;
  referralGranted: number;
};

export function summarizeTopUpEntries(
  entries: TopUpEntryForBreakdown[],
): TopUpCreditBreakdown {
  return entries.reduce<TopUpCreditBreakdown>(
    (summary, entry) => {
      const granted = entry.grantedCredits ?? entry.amount ?? 0;
      const remaining =
        entry.grantedCredits === undefined
          ? entry.balance ?? granted
          : Math.max(0, granted - (entry.usedCredits ?? 0));

      summary.totalGranted += granted;
      summary.totalRemaining += remaining;

      if (entry.source === "referral") {
        summary.referralGranted += granted;
        summary.referralRemaining += remaining;
      } else {
        summary.additionalGranted += granted;
        summary.additionalRemaining += remaining;
      }

      return summary;
    },
    {
      totalRemaining: 0,
      totalGranted: 0,
      additionalRemaining: 0,
      additionalGranted: 0,
      referralRemaining: 0,
      referralGranted: 0,
    },
  );
}
