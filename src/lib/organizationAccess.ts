export type OrganizationAccessUser = {
  onboarded?: boolean;
  onboardingAnswers?: {
    role: string;
    useCase: string[];
    channels: string[];
  };
  plan: string;
  stripeSubscriptionStatus?: string;
  isPartnerManaged: boolean;
};

export function hasCompletedKilobotOnboarding(
  user: Pick<OrganizationAccessUser, "onboardingAnswers">,
) {
  return user.onboardingAnswers !== undefined;
}

export function canAccessOrganization(
  user: OrganizationAccessUser,
): boolean {
  if (user.isPartnerManaged) {
    return user.onboarded === true;
  }
  if (!hasCompletedKilobotOnboarding(user)) {
    return false;
  }
  return (
    user.plan === "free" ||
    user.stripeSubscriptionStatus === "active" ||
    user.stripeSubscriptionStatus === "trialing"
  );
}
