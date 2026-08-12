import type { Announcement } from '@/components/whats-new/announcements';
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
    <div className="flex flex-col">
      <DialogHeader className="px-6 pt-6 pb-3">
        <DialogTitle>What’s new in Kilobot</DialogTitle>
      </DialogHeader>
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
                <AccordionContent className="px-6 pb-5">
                  <ul className="flex list-disc flex-col gap-2 pl-8 text-sm text-muted-foreground">
                    {announcement.details.map((detail) => (
                      <li key={detail}>{detail}</li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </ScrollArea>
    </div>
  );
}
