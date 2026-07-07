export type ToolMediaItem = {
  url: string;
  mediaType: string;
  filename?: string;
};

export function dedupeMediaItems<T extends ToolMediaItem>(items: T[]) {
  const byUrl = new Map<string, T>();
  for (const item of items) {
    if (!byUrl.has(item.url)) {
      byUrl.set(item.url, item);
    }
  }
  return [...byUrl.values()];
}
