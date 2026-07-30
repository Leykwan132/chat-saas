import type { PlanKey } from '../../shared/planCatalog';
import type { UpgradeScenario } from './UpgradeModal';

export function resolveUpgradeScenario(plan: PlanKey): UpgradeScenario {
  if (plan === 'free') return 'free_to_starter';
  if (plan === 'starter') return 'starter_to_growth';
  return 'growth_to_business';
}
