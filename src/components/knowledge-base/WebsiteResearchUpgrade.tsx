import { Button } from "@/components/ui/button";
import { useUpgradeModal } from "@/components/upgradeModalContext";

export function WebsiteResearchUpgrade() {
  const { openUpgradeModal } = useUpgradeModal();

  return (
    <div className="rounded-xl border border-border bg-muted/40 px-6 py-8 text-center">
      <p className="text-sm font-medium text-foreground">Website research is on paid plans</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Upgrade to research a website and train your agent on it.
      </p>
      <Button className="mt-4" type="button" onClick={() => openUpgradeModal()}>
        Upgrade
      </Button>
    </div>
  );
}
