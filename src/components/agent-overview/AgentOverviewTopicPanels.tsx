import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function OverviewPanelTitle({
  title,
  description,
  sample = false,
}: {
  title: string;
  description: string;
  sample?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 font-sans font-medium leading-tight">
        {title}
        {sample ? <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">Sample data</span> : null}
      </div>
      <div className="mt-0.5 text-sm font-normal leading-tight text-muted-foreground">
        {description}
      </div>
    </div>
  );
}

export function LockedTopicAnalyticsPanel({
  title,
  onPreview,
  onUpgrade,
}: {
  title: string;
  onPreview: () => void;
  onUpgrade?: () => void;
}) {
  return (
    <div className="group relative flex h-[340px] flex-col overflow-hidden rounded-lg border border-border/70 bg-background px-5 py-5">
      <OverviewPanelTitle title={title} description="Available on Growth and Business." />
      <div className="flex flex-1 items-center justify-center">
        <Lock className="size-8 text-muted-foreground/40" />
      </div>
      <div className="absolute inset-0 flex items-center justify-center gap-2 bg-background/90 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <Button type="button" variant="outline" onClick={onPreview}>Preview</Button>
        <Button type="button" onClick={onUpgrade}>Upgrade</Button>
      </div>
    </div>
  );
}

export function AgentOverviewPreviewUpgradeAction({
  onUpgrade,
}: {
  onUpgrade?: () => void;
}) {
  return (
    <div className="flex justify-start px-5 pb-5">
      <Button type="button" onClick={onUpgrade}>Upgrade now</Button>
    </div>
  );
}
