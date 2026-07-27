export function isSameWebUrl(a: string, b: string): boolean {
  return a.trim().replace(/\/+$/, "") === b.trim().replace(/\/+$/, "");
}

export function hasParentWebUrl(
  entries: ReadonlyArray<{ url: string; parentId?: string }>,
  url: string,
): boolean {
  return entries.some((entry) => !entry.parentId && isSameWebUrl(entry.url, url));
}
