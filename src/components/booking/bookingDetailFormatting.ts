export function formatCollectedFieldValue(
  value: string | number | boolean | null | undefined,
) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}
