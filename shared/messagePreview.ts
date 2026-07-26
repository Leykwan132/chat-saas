export function truncateMessagePreview(content: string, maximumLength: number) {
  return Array.from(content).slice(0, maximumLength).join("");
}
