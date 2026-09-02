import { Check } from "lucide-react";
import { getPlanKeyFeatures, PLAN_CATALOG } from "../../../shared/planCatalog";
import { type PlanKey } from "@/lib/whiteLabelApi";

export function PartnerPlanDetails({ planKey }: { planKey: PlanKey }) {
  const plan = PLAN_CATALOG[planKey];
  const features = getPlanKeyFeatures(planKey);

  return (
    <div className="rounded-lg border border-border px-4 py-3">
      <p className="text-sm font-medium">Included with {plan.name}</p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {features.map((feature) => (
          <li
            key={feature}
            className="flex items-start gap-2 text-sm text-muted-foreground"
          >
            <Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
