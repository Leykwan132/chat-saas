const prefix = "kilobot-last-location:";

export function locationKey(userId: string, teamId: string) {
  return `${prefix}${encodeURIComponent(userId)}:${encodeURIComponent(teamId)}`;
}

export function restorablePath(path: string) {
  return (
    /^\/(workspace(?:\/|\?|#|$)|dashboard\/[^/?#]+(?:\/|\?|#|$))/.test(path) &&
    !path.startsWith("//")
  );
}

export function clearLastLocations() {
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith(prefix)) localStorage.removeItem(key);
  }
}

export function restoreDestination(path: string, agentIds: readonly string[]) {
  if (!restorablePath(path)) return null;
  const agentId = /^\/dashboard\/([^/?#]+)/.exec(path)?.[1];
  return agentId && !agentIds.includes(agentId) ? null : path;
}
