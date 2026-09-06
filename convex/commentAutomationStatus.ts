type PageSubscriptionStatus = "pending" | "subscribed" | "failed";

export function getAutomationToggleResult(
  active: boolean,
  pageStatuses: PageSubscriptionStatus[],
) {
  if (!active) return { status: "inactive" as const, needsSubscription: false };
  const needsSubscription = pageStatuses.some((status) => status !== "subscribed");
  return {
    status: needsSubscription ? "inactive" as const : "active" as const,
    needsSubscription,
  };
}
