import { Package } from 'lucide-react';
import { AnnouncementDialogList } from '@/components/whats-new/AnnouncementDialogList';
import { ANNOUNCEMENTS } from '@/components/whats-new/announcements';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';

export function WhatsNewDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="rounded-lg">
          <Package data-icon="inline-start" />
          What’s new
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden rounded-xl p-0 sm:max-w-2xl">
        <DialogDescription className="sr-only">
          Browse the latest Kilobot product announcements.
        </DialogDescription>
        <img
          src="https://storage.kilobot.app/dashboard/new%20feature%402x.png"
          alt="Kilobot AI conversations and call analytics preview"
          className="aspect-[12/5] max-h-[35dvh] w-full object-cover"
        />
        <AnnouncementDialogList announcements={ANNOUNCEMENTS} />
      </DialogContent>
    </Dialog>
  );
}
