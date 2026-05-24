export type CreditEntity = {
  credits?: number;
  purchasedCredits?: number;
  purchasedCreditsGranted?: number;
};

export function getMonthlyCredits(entity: CreditEntity): number {
  return entity.credits ?? 0;
}

export function getPurchasedCredits(entity: CreditEntity): number {
  return entity.purchasedCredits ?? 0;
}

export function getTotalCreditBalance(entity: CreditEntity): number {
  return getMonthlyCredits(entity) + getPurchasedCredits(entity);
}

export function getPurchasedCreditsGranted(entity: CreditEntity): number {
  const remaining = getPurchasedCredits(entity);
  const granted = entity.purchasedCreditsGranted;
  if (granted !== undefined) {
    return Math.max(granted, remaining);
  }
  return remaining;
}

export function nextPurchasedCreditGrant(
  entity: CreditEntity,
  amount: number,
): { purchasedCredits: number; purchasedCreditsGranted: number } {
  const remaining = getPurchasedCredits(entity);
  const granted = getPurchasedCreditsGranted(entity);
  return {
    purchasedCredits: remaining + amount,
    purchasedCreditsGranted: granted + amount,
  };
}

export function applyCreditDeduction(
  entity: CreditEntity,
  cost: number,
): { credits: number; purchasedCredits: number; totalAfter: number } {
  if (cost <= 0) {
    return {
      credits: getMonthlyCredits(entity),
      purchasedCredits: getPurchasedCredits(entity),
      totalAfter: getTotalCreditBalance(entity),
    };
  }

  let monthly = getMonthlyCredits(entity);
  let purchased = getPurchasedCredits(entity);
  const fromMonthly = Math.min(monthly, cost);
  monthly -= fromMonthly;
  purchased -= cost - fromMonthly;

  return {
    credits: monthly,
    purchasedCredits: purchased,
    totalAfter: monthly + purchased,
  };
}
