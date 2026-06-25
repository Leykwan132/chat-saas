import { formatDistanceToNowStrict } from 'date-fns';

/** e.g. "Created 3 days ago", "Connected 2 hours ago" */
export function formatPrefixedRelativeAge(prefix: string, timestamp: number): string {
  const ago = formatDistanceToNowStrict(new Date(timestamp), { addSuffix: true });
  return `${prefix} ${ago}`;
}
