import { Package } from 'lucide-react';
import { useCallback, useState } from 'react';
import { AnnouncementDetailsDialog } from '@/components/whats-new/AnnouncementDetailsDialog';
import { AnnouncementPopoverList } from '@/components/whats-new/AnnouncementPopoverList';
import {
  ANNOUNCEMENTS,
  type Announcement,
} from '@/components/whats-new/announcements';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export function WhatsNewDialog() {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  const handleViewDetails = useCallback((announcement: Announcement) => {
    setPopoverOpen(false);
    setSelectedAnnouncement(announcement);
    setDialogOpen(true);
  }, []);

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="rounded-lg">
            <Package data-icon="inline-start" />
            What’s new
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          sideOffset={8}
          className="w-[min(42rem,calc(100vw-2rem))] gap-0 overflow-hidden rounded-xl p-0"
        >
          <AnnouncementPopoverList
            announcements={ANNOUNCEMENTS}
            onViewDetails={handleViewDetails}
          />
        </PopoverContent>
      </Popover>
      <AnnouncementDetailsDialog
        announcement={selectedAnnouncement}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}
