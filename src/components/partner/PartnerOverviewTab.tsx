import { PartnerPanel } from "@/components/partner/PartnerPanel";
import { CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { type PartnerOverview } from "@/lib/whiteLabelApi";

export function PartnerOverviewTab({
  overview,
}: {
  overview: PartnerOverview | undefined;
}) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      <Metric label="Customers" value={overview?.activeOrganizations} />
      <Metric label="Credits spent" value={overview?.totalSpentCredits} />
      <Metric
        label="Credits top-up"
        value={overview?.totalGrantedCredits}
      />
      <Metric label="Starter plan" value={overview?.planMix.starter} />
      <Metric label="Growth plan" value={overview?.planMix.growth} />
      <Metric label="Business plan" value={overview?.planMix.business} />
    </div>
  );
}

function Metric({
  label,
  value,
  description,
}: {
  label: string;
  value: number | string | undefined;
  description?: string;
}) {
  const formattedValue =
    typeof value === "number" ? value.toLocaleString() : value;

  return (
    <PartnerPanel>
      <CardContent>
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          {value === undefined ? (
            <Skeleton className="h-7 w-12" />
          ) : (
            <p
              className={
                typeof value === "number"
                  ? "text-2xl font-semibold"
                  : "truncate text-xl font-semibold"
              }
            >
              {formattedValue}
            </p>
          )}
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </CardContent>
    </PartnerPanel>
  );
}
