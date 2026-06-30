import { useState, type ReactNode } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type WorkflowImagePreviewProps = {
  src: string;
  alt: string;
  mediaType?: string;
  children: ReactNode;
};

export function WorkflowImagePreview({
  src,
  alt,
  mediaType,
  children,
}: WorkflowImagePreviewProps) {
  const [open, setOpen] = useState(false);
  const isVideo = mediaType?.startsWith('video/');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        showCloseButton
        className={cn(
          'fixed inset-0 z-50 m-0 h-svh w-svw max-w-none translate-none transform-none',
          'left-0 top-0 rounded-none border-0 bg-black/50 p-0 shadow-none ring-0 supports-backdrop-filter:backdrop-blur-sm',
          'sm:left-0 sm:top-0 sm:max-w-none',
          '[&_[data-slot=dialog-close]]:z-10 [&_[data-slot=dialog-close]]:bg-white/10',
          '[&_[data-slot=dialog-close]]:text-white [&_[data-slot=dialog-close]]:hover:bg-white/20',
        )}
      >
        <DialogTitle className="sr-only">{alt}</DialogTitle>
        <div
          className="absolute inset-0 flex cursor-default items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          {isVideo ? (
            <video
              src={src}
              className="max-h-full max-w-full cursor-default object-contain"
              controls
              playsInline
              onClick={(event) => event.stopPropagation()}
            />
          ) : (
            <img
              src={src}
              alt={alt}
              className="max-h-full max-w-full cursor-default object-contain"
              onClick={(event) => event.stopPropagation()}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
