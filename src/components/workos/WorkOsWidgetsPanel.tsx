import { WorkOsWidgets } from '@workos-inc/widgets';
import { cn } from '@/lib/utils';

type WorkOsWidgetsPanelProps = {
  children: React.ReactNode;
  className?: string;
};

export function WorkOsWidgetsPanel({ children, className }: WorkOsWidgetsPanelProps) {
  return (
    <div
      className={cn(
        'workos-widgets-panel w-full rounded-xl border border-border bg-card',
        className,
      )}
    >
      <WorkOsWidgets className="workos-widgets--panel">
        <div className="flex flex-col gap-6 p-6">{children}</div>
      </WorkOsWidgets>
    </div>
  );
}
