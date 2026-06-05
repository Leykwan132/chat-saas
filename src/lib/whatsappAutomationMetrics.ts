export const MARKETING_RATE_MYR = 0.3467;

export function formatReplyRate(
  messagesSentCount: number | undefined,
  repliesReceivedCount: number | undefined,
): string {
  const sent = messagesSentCount ?? 0;
  const replied = repliesReceivedCount ?? 0;
  if (sent === 0) return '—';
  return `${((replied / sent) * 100).toFixed(1)}%`;
}

export function formatEstimatedCostSoFar(
  messagesSentCount: number | undefined,
  estimatedCostPerCustomer: number | undefined,
  maxAttempts: number,
): string {
  const sent = messagesSentCount ?? 0;
  if (estimatedCostPerCustomer === undefined || maxAttempts < 1) {
    return sent === 0 ? 'RM 0.00' : '—';
  }
  const costPerMessage = estimatedCostPerCustomer / maxAttempts;
  return `RM ${(sent * costPerMessage).toFixed(2)}`;
}

export function hoursToLabel(hours: number): string {
  if (hours % 168 === 0) return `${hours / 168} week${hours / 168 === 1 ? '' : 's'}`;
  if (hours % 24 === 0) return `${hours / 24} day${hours / 24 === 1 ? '' : 's'}`;
  return `${hours} hour${hours === 1 ? '' : 's'}`;
}
