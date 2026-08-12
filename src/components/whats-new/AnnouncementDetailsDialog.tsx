import type { Announcement } from '@/components/whats-new/announcements';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

type AnnouncementDetailsDialogProps = {
  announcement: Announcement | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AnnouncementDetailsDialog({
  announcement,
  open,
  onOpenChange,
}: AnnouncementDetailsDialogProps) {
  if (announcement === null) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{announcement.title}</DialogTitle>
          <DialogDescription>{announcement.summary}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <ul className="flex list-disc flex-col gap-3 pl-5 text-sm text-muted-foreground">
            {announcement.details.map((detail) => (
              <li key={detail}>{detail}</li>
            ))}
          </ul>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
