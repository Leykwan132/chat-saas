import type { Announcement } from '@/components/whats-new/announcements';
import { AnnouncementReleaseDetails } from '@/components/whats-new/AnnouncementReleaseDetails';
import { ChevronRight } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

type AnnouncementDialogListProps = {
  announcements: Announcement[];
};

export function AnnouncementDialogList({
  announcements,
}: AnnouncementDialogListProps) {
  return (
    <div className="flex min-h-0 flex-col overflow-hidden">
      <DialogHeader className="px-6 pt-6 pb-3">
        <DialogTitle>What’s new in Kilobot</DialogTitle>
      </DialogHeader>
      <ScrollArea className="min-h-0 flex-1">
        <Accordion type="single" collapsible className="rounded-none border-0">
          {announcements.map((announcement) => {
            const Icon = announcement.icon;

            return (
              <AccordionItem key={announcement.id} value={announcement.id}>
                <AccordionTrigger
                  showIndicator={false}
                  className="px-6 py-4 hover:no-underline"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center [&_svg]:size-4">
                      <Icon />
                    </span>
                    <span className="flex min-w-0 flex-col gap-1 text-left">
                      <span className="flex items-center gap-2">
                        <span className="font-medium">{announcement.title}</span>
                        {announcement.isNew ? (
                          <Badge
                            variant="outline"
                            className="bg-muted text-muted-foreground"
                          >
                            New
                          </Badge>
                        ) : null}
                      </span>
                      <span className="font-normal leading-5 text-muted-foreground">
                        {announcement.summary}
                      </span>
                    </span>
                  </div>
                  <ChevronRight
                    data-slot="announcement-chevron"
                    className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]/accordion-trigger:rotate-90"
                  />
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-5">
                  <AnnouncementReleaseDetails announcement={announcement} />
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </ScrollArea>
    </div>
  );
}
