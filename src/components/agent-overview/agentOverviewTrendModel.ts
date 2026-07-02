import type { OverviewTrendRow } from './AgentOverviewTrendChart';

type SummaryDailyRow = {
  date: string;
  bookings: number;
  aiAssistedConversations: number;
  escalations: number;
};

type CreditDailyRow = {
  date: string;
  credits: number;
};

export type OverviewTrendDataMode = 'daily' | 'cumulative';

function formatDateLabel(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function buildOverviewTrendRows(
  summaryDaily: SummaryDailyRow[],
  creditDaily: CreditDailyRow[] | undefined,
  dataMode: OverviewTrendDataMode = 'daily',
): OverviewTrendRow[] {
  const creditsByDate = new Map(
    (creditDaily ?? []).map((row) => [row.date, row.credits]),
  );
  let cumulativeCredits = 0;
  let cumulativeAiAssistedConversations = 0;
  let cumulativeBookings = 0;
  let cumulativeEscalations = 0;

  return summaryDaily.map((row) => {
    const dailyCredits = creditsByDate.get(row.date) ?? 0;
    cumulativeCredits += dailyCredits;
    cumulativeAiAssistedConversations += row.aiAssistedConversations;
    cumulativeBookings += row.bookings;
    cumulativeEscalations += row.escalations;

    const credits = dataMode === 'cumulative' ? cumulativeCredits : dailyCredits;
    const aiAssistedConversations =
      dataMode === 'cumulative'
        ? cumulativeAiAssistedConversations
        : row.aiAssistedConversations;
    const bookings = dataMode === 'cumulative' ? cumulativeBookings : row.bookings;
    const humanEscalations =
      dataMode === 'cumulative' ? cumulativeEscalations : row.escalations;

    return {
      date: row.date,
      dateLabel: formatDateLabel(row.date),
      aiAssistedConversations,
      credits,
      bookings,
      humanEscalations,
    };
  });
}
