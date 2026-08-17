import { useEffect, useState } from 'react';

export type RetainedOverviewData<TSummary, TCreditUsage> = {
  summary: TSummary;
  creditUsage: TCreditUsage;
};

export function resolveRetainedOverviewData<TSummary, TCreditUsage>(
  previousData: RetainedOverviewData<TSummary, TCreditUsage> | undefined,
  summary: TSummary | undefined,
  creditUsage: TCreditUsage | undefined,
) {
  if (summary !== undefined && creditUsage !== undefined) {
    return {
      data: { summary, creditUsage },
      isRefreshing: false,
    };
  }

  return {
    data: previousData,
    isRefreshing: previousData !== undefined,
  };
}

export function useRetainedOverviewData<TSummary, TCreditUsage>(
  summary: TSummary | undefined,
  creditUsage: TCreditUsage | undefined,
) {
  const [previousData, setPreviousData] = useState<RetainedOverviewData<TSummary, TCreditUsage>>();

  useEffect(() => {
    if (summary === undefined || creditUsage === undefined) return;

    setPreviousData({ summary, creditUsage });
  }, [creditUsage, summary]);

  return resolveRetainedOverviewData(previousData, summary, creditUsage);
}
