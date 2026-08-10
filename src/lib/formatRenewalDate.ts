const renewalDateFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Kuala_Lumpur',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const renewalTimeFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Kuala_Lumpur',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

export function formatRenewalDate(timestamp: number): string {
  const date = new Date(timestamp);
  const parts = Object.fromEntries(
    renewalDateFormatter
      .formatToParts(date)
      .filter(({ type }) => type !== 'literal')
      .map(({ type, value }) => [type, value]),
  );
  return `${parts.month} ${parts.day}, ${parts.year} at ${renewalTimeFormatter.format(date)} MYT`;
}
