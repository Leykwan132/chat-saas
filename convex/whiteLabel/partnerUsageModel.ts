export function addPartnerUsage(
  current: { totalTokens: number; totalCostUsd: number; requestCount: number },
  usage: { totalTokens: number; costUsd: number },
) {
  return {
    totalTokens: current.totalTokens + usage.totalTokens,
    totalCostUsd: current.totalCostUsd + usage.costUsd,
    requestCount: current.requestCount + 1,
  };
}
