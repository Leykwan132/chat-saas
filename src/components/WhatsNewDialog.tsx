import { Sparkles } from 'lucide-react';
import { ANNOUNCEMENTS } from '@/components/whats-new/announcements';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

export function WhatsNewDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 rounded-full focus-visible:ring-0"
          aria-label="What’s new"
        >
          <Sparkles data-icon="inline-start" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>What’s new</DialogTitle>
          <DialogDescription>Review the latest improvements to Kilobot.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="flex flex-col gap-4">
            {ANNOUNCEMENTS.map((announcement) => (
              <section key={announcement.title} className="flex flex-col gap-3 rounded-xl border p-5">
                <div className="flex flex-col gap-1">
                  <h2 className="font-medium">{announcement.title}</h2>
                  <p className="text-sm text-muted-foreground">{announcement.summary}</p>
                </div>
                <ul className="flex list-disc flex-col gap-2 pl-5 text-sm text-muted-foreground">
                  {announcement.details.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
