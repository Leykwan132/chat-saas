import { Contact, PanelRightOpen, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

type InboxMobileDetailsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerName: string;
  platform: string;
  phone?: string | null;
  email?: string | null;
  status?: string;
  leadTemperature?: string;
  tags?: string[];
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/70 py-3 last:border-b-0">
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-right text-sm font-medium text-foreground">
        {value || '—'}
      </span>
    </div>
  );
}

export function InboxMobileDetailsSheet({
  open,
  onOpenChange,
  customerName,
  platform,
  phone,
  email,
  status,
  leadTemperature,
  tags = [],
}: InboxMobileDetailsSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button
          id="mobile-details-button"
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0 text-muted-foreground hover:text-foreground md:hidden"
          aria-label="Show customer details"
        >
          <PanelRightOpen className="size-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full max-w-none p-0 sm:max-w-sm">
        <SheetHeader className="border-b border-border px-4 py-4 pr-14">
          <SheetTitle className="flex items-center gap-2">
            <Contact className="size-4 text-muted-foreground" />
            {customerName}
          </SheetTitle>
          <SheetDescription>Customer and conversation details</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <div className="rounded-xl border border-border bg-background px-3">
            <DetailRow label="Platform" value={platform} />
            <DetailRow label="Status" value={status ?? ''} />
            <DetailRow label="Phone number" value={phone ?? ''} />
            <DetailRow label="Email" value={email ?? ''} />
            {leadTemperature ? <DetailRow label="Lead temperature" value={leadTemperature} /> : null}
          </div>
          <div className="mt-4 rounded-xl border border-border bg-background px-3 py-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Tag className="size-4 text-muted-foreground" />
              Tags
            </div>
            {tags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                    {tag}
                  </span>
                ))}
              </div>
            ) : (
              <p className="m-0 text-sm text-muted-foreground">No tags yet.</p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
