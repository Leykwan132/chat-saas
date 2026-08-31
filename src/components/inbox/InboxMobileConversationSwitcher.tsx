import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

export function InboxMobileConversationSwitcher({
  open,
  onOpenChange,
  customerName,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerName: string;
  children: ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button
          id="mobile-conversation-switcher"
          type="button"
          variant="ghost"
          className="h-9 min-w-0 max-w-full justify-start gap-1.5 px-2 text-sm font-semibold"
        >
          <span className="truncate">{customerName}</span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-full max-w-none p-0 sm:!max-w-none"
        showCloseButton={false}
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Conversations</SheetTitle>
        </SheetHeader>
        <div className="h-full pt-12">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
