import { Share2 } from 'lucide-react';
import { AvatarEmbedCard } from './AvatarEmbedCard';
import { AvatarLiveLink } from './AvatarLiveLink';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export function AvatarShareDialog({ publicKey }: { publicKey: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="default" className="gap-2">
          <Share2 data-icon="inline-start" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share your Avatar</DialogTitle>
          <DialogDescription>
            Share the live link or embed your Avatar on a website.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6">
          <AvatarLiveLink publicKey={publicKey} />
          <AvatarEmbedCard publicKey={publicKey} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
