export const DEFAULT_MESSAGE_WAIT_SECONDS = 5;

export function resolveMessageWaitSeconds(
  agentValue: number | undefined,
): number {
  if (agentValue === undefined) return DEFAULT_MESSAGE_WAIT_SECONDS;
  if (!Number.isInteger(agentValue) || agentValue < 0 || agentValue > 60) {
    throw new Error("Choose a whole number of seconds between 0 and 60");
  }
  return agentValue;
}
