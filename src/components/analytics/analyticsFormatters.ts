export function formatAnalyticsDuration(ms: number | null | undefined) {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) {
    return '—';
  }

  const minutes = Math.round(ms / 60000);
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.round((minutes / 60) * 10) / 10;
  if (hours < 48) {
    return `${hours}h`;
  }

  const days = Math.round((hours / 24) * 10) / 10;
  return `${days}d`;
}

export function formatAnalyticsNumber(value: number | undefined) {
  return new Intl.NumberFormat().format(Math.round(value ?? 0));
}

export function formatAnalyticsRate(value: number | undefined) {
  return `${(value ?? 0).toFixed((value ?? 0) % 1 === 0 ? 0 : 1)}%`;
}

export function formatAnalyticsDecimal(value: number | undefined) {
  return (value ?? 0).toFixed(1);
}
