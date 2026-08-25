export type OrganizationAccessUser = {
  onboarded?: boolean;
  plan: string;
  stripeSubscriptionStatus?: string;
  isPartnerManaged: boolean;
};

export function canAccessOrganization(
  user: OrganizationAccessUser,
): boolean {
  if (!user.onboarded) return false;
  return (
    user.isPartnerManaged ||
    user.plan === "free" ||
    user.stripeSubscriptionStatus === "active" ||
    user.stripeSubscriptionStatus === "trialing"
  );
}
