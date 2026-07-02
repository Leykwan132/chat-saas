export function formatWholeNumber(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '—';
  }

  return new Intl.NumberFormat().format(Math.round(value));
}

export function formatCredits(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '—';
  }

  return `${new Intl.NumberFormat().format(Math.round(value))} credits`;
}

export function formatRate(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '—';
  }

  return `${(value * 100).toFixed(value * 100 % 1 === 0 ? 0 : 1)}%`;
}

export function formatAverage(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '—';
  }

  return value.toFixed(value % 1 === 0 ? 0 : 1);
}
