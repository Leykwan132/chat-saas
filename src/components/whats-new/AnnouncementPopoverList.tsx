import { ArrowRight } from 'lucide-react';
import type { Announcement } from '@/components/whats-new/announcements';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

type AnnouncementPopoverListProps = {
  announcements: Announcement[];
  onViewDetails: (announcement: Announcement) => void;
};

export function AnnouncementPopoverList({
  announcements,
  onViewDetails,
}: AnnouncementPopoverListProps) {
  return (
    <div className="flex flex-col">
      <div className="px-6 pt-6 pb-3">
        <h2 className="text-base font-semibold">What’s new in Kilobot</h2>
      </div>
      <ScrollArea className="max-h-[min(32rem,70vh)]">
        <Accordion type="single" collapsible className="rounded-none border-0">
          {announcements.map((announcement) => {
            const Icon = announcement.icon;

            return (
              <AccordionItem key={announcement.id} value={announcement.id}>
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center [&_svg]:size-4">
                      <Icon />
                    </span>
                    <span className="flex min-w-0 flex-col gap-1 text-left">
                      <span className="flex items-center gap-2">
                        <span className="font-medium">{announcement.title}</span>
                        {announcement.isNew ? <Badge variant="outline">New</Badge> : null}
                      </span>
                      <span className="font-normal leading-5 text-muted-foreground">
                        {announcement.summary}
                      </span>
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="flex justify-end px-6">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onViewDetails(announcement)}
                  >
                    {announcement.actionLabel}
                    <ArrowRight data-icon="inline-end" />
                  </Button>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </ScrollArea>
    </div>
  );
}
