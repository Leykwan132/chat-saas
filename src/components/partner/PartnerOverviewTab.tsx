import { PartnerPanel } from "@/components/partner/PartnerPanel";
import { CardContent } from "@/components/ui/card";
import { type PartnerOverview } from "@/lib/whiteLabelApi";

export function PartnerOverviewTab({
  overview,
}: {
  overview: PartnerOverview | undefined;
}) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      <Metric label="Customers" value={overview?.activeOrganizations ?? 0} />
      <Metric label="Credits spent" value={overview?.totalSpentCredits ?? 0} />
      <Metric
        label="Credits top-up"
        value={overview?.totalGrantedCredits ?? 0}
      />
      <Metric label="Starter plan" value={overview?.planMix.starter ?? 0} />
      <Metric label="Growth plan" value={overview?.planMix.growth ?? 0} />
      <Metric label="Business plan" value={overview?.planMix.business ?? 0} />
    </div>
  );
}

function Metric({
  label,
  value,
  description,
}: {
  label: string;
  value: number | string;
  description?: string;
}) {
  const formattedValue =
    typeof value === "number" ? value.toLocaleString() : value;

  return (
    <PartnerPanel>
      <CardContent>
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p
            className={
              typeof value === "number"
                ? "text-2xl font-semibold"
                : "truncate text-xl font-semibold"
            }
          >
            {formattedValue}
          </p>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </CardContent>
    </PartnerPanel>
  );
}
