export function selectLatestStripeSubscription<T>(
  subscriptions: readonly T[],
): T | undefined {
  return subscriptions[subscriptions.length - 1];
}
