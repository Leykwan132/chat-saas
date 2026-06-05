import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { AnimatedGridPattern } from '@/components/ui/animated-grid-pattern';

export const BAN_GUIDE_META = {
  tag: 'Broadcast',
  bookTitle: 'Avoid bans',
  dialogLabel: 'Avoid bans',
} as const;

const OVERVIEW_SLIDE_HEIGHT_CLASS =
  'h-[min(440px,calc(90vh-5.5rem))] min-h-[400px]';

interface WhatsAppBanGuideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  step: number;
  onStepChange: (step: number) => void;
}

export function WhatsAppBanGuideDialog({
  open,
  onOpenChange,
  onStepChange,
}: WhatsAppBanGuideDialogProps) {
  const handleOpenChange = (next: boolean) => {
    if (!next) onStepChange(0);
    onOpenChange(next);
  };

  const points = [
    'Initiating a conversation without using an approved message template',
    'Sending messages outside of the 24-hour customer service window',
    'Messaging contacts who have not explicitly opted in',
  ];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[min(90vh,640px)] flex-col gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-[880px]">
        <DialogTitle className="sr-only">{BAN_GUIDE_META.dialogLabel}</DialogTitle>
        <div className={cn('w-full flex flex-col', OVERVIEW_SLIDE_HEIGHT_CLASS)}>
          <div className="flex h-full w-full flex-col overflow-hidden md:flex-row md:items-stretch">
            <div className="flex min-h-0 flex-1 flex-col justify-center gap-4 overflow-y-auto px-6 py-6 sm:px-10 md:overflow-visible md:py-10">
              <div className="flex flex-col gap-2.5">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  Why accounts get banned
                </h2>
                <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                  Most WhatsApp bans happen when businesses message people the wrong way—not because the tool failed.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Common mistakes
                </h3>
                <ul className="flex flex-col gap-2.5">
                  {points.map((point) => (
                    <li
                      key={point}
                      className="flex items-start gap-2.5 text-sm leading-snug text-foreground/90"
                    >
                      <X
                        className="mt-0.5 size-4 shrink-0 text-foreground"
                        strokeWidth={2.5}
                      />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="relative h-[min(240px,38vh)] shrink-0 overflow-hidden border-t border-border/40 bg-muted/15 md:h-full md:border-t-0 md:border-l md:w-[48%]">
              <div className="pointer-events-none absolute inset-0 size-full">
                <AnimatedGridPattern
                  width={40}
                  height={40}
                  maxOpacity={0.18}
                  numSquares={72}
                  className="size-full opacity-40 dark:opacity-20"
                />
              </div>
              <div className="relative z-10 flex size-full items-center justify-center p-6 md:p-8">
                <div className="w-full">
                  <div className="flex size-full max-h-full w-full items-center justify-center">
                    <img
                      src="/restricted.png"
                      alt="WhatsApp account restricted for policy violations"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-4 border-t border-border/40 px-6 py-4 sm:px-8">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="min-w-[4.5rem] font-semibold"
            onClick={() => onOpenChange(false)}
          >
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
