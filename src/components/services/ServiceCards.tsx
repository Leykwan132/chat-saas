import { Link } from 'react-router';
import { Plus } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import type { ServiceRow } from '@/lib/serviceForm';
import { cn } from '@/lib/utils';

function formatBookingCount(count: number) {
  return count === 1 ? '1 booking' : `${count} bookings`;
}

export function AddServiceCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex size-56 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-card px-3.5 py-3.5 transition-colors',
        'text-muted-foreground hover:border-foreground/20 hover:bg-muted/30 hover:text-foreground',
      )}
      aria-label="Add a service"
    >
      <Plus className="size-6" strokeWidth={1.75} />
      <span className="text-xs font-medium">Add a service</span>
    </button>
  );
}

export function ServiceCard({
  service,
  canManage,
  detailHref,
  onToggleActive,
}: {
  service: ServiceRow;
  canManage: boolean;
  detailHref: string;
  onToggleActive: (isActive: boolean) => void;
}) {
  return (
    <Link
      to={detailHref}
      className={cn(
        'group flex size-56 flex-col rounded-lg border border-border bg-card px-3.5 py-3.5 transition-colors',
        'hover:border-foreground/20 hover:bg-muted/30',
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <h3 className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{service.name}</h3>
        {service.description?.trim() ? <p className="mt-1.5 text-xs leading-snug text-muted-foreground">{service.description.trim()}</p> : null}
      </div>
      <div className="mt-auto flex items-end justify-between gap-2 pt-3">
        <p className="text-xs text-muted-foreground">{formatBookingCount(service.bookingCount ?? 0)}</p>
        <div
          className="relative z-10 flex shrink-0 items-center gap-1.5"
          onClick={(event) => { event.preventDefault(); event.stopPropagation(); }}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <span className="text-xs text-muted-foreground">{service.isActive ? 'Active' : 'Inactive'}</span>
          <Switch
            checked={service.isActive}
            onCheckedChange={onToggleActive}
            disabled={!canManage}
            aria-label={`${service.isActive ? 'Turn off' : 'Turn on'} ${service.name}`}
            className="scale-90 data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-input"
          />
        </div>
      </div>
    </Link>
  );
}
