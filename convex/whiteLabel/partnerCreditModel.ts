import type { PlanKey } from "../planCatalog";

export function resolvePartnerOrganizationPlan(args: {
  currentPlanKey: PlanKey;
  pendingPlanKey?: PlanKey;
  periodEnd: number;
  now: number;
}): PlanKey {
  if (args.pendingPlanKey && args.now >= args.periodEnd) {
    return args.pendingPlanKey;
  }
  return args.currentPlanKey;
}

export function deductPartnerOrganizationCredits(args: {
  monthlyRemaining: number;
  manualGrantRemaining: number;
  credits: number;
}): { monthlyCredits: number; manualGrantCredits: number } {
  if (!Number.isInteger(args.credits) || args.credits <= 0) {
    throw new Error("Credit deduction must be a positive whole number.");
  }

  if (args.monthlyRemaining + args.manualGrantRemaining < args.credits) {
    throw new Error("Insufficient credits.");
  }

  const monthlyCredits = Math.min(args.monthlyRemaining, args.credits);
  return {
    monthlyCredits,
    manualGrantCredits: args.credits - monthlyCredits,
  };
}
