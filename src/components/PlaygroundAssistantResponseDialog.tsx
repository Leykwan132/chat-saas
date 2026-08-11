import type { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';

type PlaygroundAssistantResponseDialogProps = {
  children: ReactNode;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: string;
};

type PlaygroundAssistantResponseDialogContentProps = Pick<
  PlaygroundAssistantResponseDialogProps,
  'children' | 'title'
>;

export function PlaygroundAssistantResponseDialogContent({
  children,
  title,
}: PlaygroundAssistantResponseDialogContentProps) {
  return (
    <div className="flex h-[min(92vh,960px)] flex-col overflow-hidden">
      <div className="shrink-0 border-b border-border px-5 py-4 pr-14">
        <h2 className="font-heading text-base leading-none font-medium">{title}</h2>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {children}
      </div>
    </div>
  );
}

export function PlaygroundAssistantResponseDialog({
  children,
  onOpenChange,
  open,
  title,
}: PlaygroundAssistantResponseDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="w-full max-w-[min(calc(100%-2rem),52rem)] gap-0 overflow-hidden rounded-lg p-0 sm:max-w-[min(calc(100%-2rem),52rem)]">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">
          Full assistant response
        </DialogDescription>
        <PlaygroundAssistantResponseDialogContent title={title}>
          {children}
        </PlaygroundAssistantResponseDialogContent>
      </DialogContent>
    </Dialog>
  );
}
