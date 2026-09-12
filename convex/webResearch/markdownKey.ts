function sanitizePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
}

export function generateWebMarkdownKey(
  orgId: string,
  agentId: string,
  entryId: string,
): string {
  const owner = sanitizePathSegment(orgId.trim()) || "personal";
  const safeAgentId = sanitizePathSegment(agentId.trim());
  const safeEntryId = sanitizePathSegment(entryId.trim());
  return `knowledge-base/web-markdown/${owner}/${safeAgentId}/${safeEntryId}/${crypto.randomUUID()}.md`;
}
