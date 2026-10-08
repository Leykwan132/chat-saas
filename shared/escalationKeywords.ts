export function normalizeEscalationKeywords(keywords: string[]): string[] {
  if (keywords.length > 50) throw new Error("Use up to 50 keywords");
  const unique = new Map<string, string>();
  for (const value of keywords) {
    const keyword = value.trim();
    if (!keyword) continue;
    if (keyword.length > 100) throw new Error("Each keyword must be 100 characters or fewer");
    const key = keyword.toLowerCase();
    if (!unique.has(key)) unique.set(key, keyword);
  }
  return [...unique.values()];
}

export function findEscalationKeyword(content: string, keywords: string[]): string | undefined {
  const message = content.toLowerCase();
  return keywords.find((keyword) => keyword.trim().length > 0 && message.includes(keyword.trim().toLowerCase()));
}
