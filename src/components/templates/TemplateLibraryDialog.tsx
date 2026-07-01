import { FileText, List, Megaphone, MessageSquareText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { TEMPLATE_LIBRARY_PRESETS } from './templateBuilderConstants';
import type { TemplateLibraryPreset } from './templateBuilderTypes';

const presetIcons = [MessageSquareText, FileText, Megaphone];

type TemplateLibraryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectPreset: (preset: TemplateLibraryPreset) => void;
};

export function TemplateLibraryDialog({
  open,
  onOpenChange,
  onSelectPreset,
}: TemplateLibraryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="xs"
          className="h-8 gap-1.5 px-3 text-[13px] has-data-[icon=inline-start]:pl-2.5"
        >
          <List data-icon="inline-start" />
          Template Library
        </Button>
      </DialogTrigger>
      <DialogContent className="p-8 sm:!max-w-[544px] md:!max-w-xl md:p-12">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold">
            Choose a Template
          </DialogTitle>
          <DialogDescription className="sr-only">
            Choose a starting point for the WhatsApp template.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 flex flex-wrap justify-center gap-6">
          {TEMPLATE_LIBRARY_PRESETS.map((preset, index) => {
            const Icon = presetIcons[index] ?? FileText;
            return (
              <button
                key={preset.id}
                type="button"
                aria-label={`${preset.title}: ${preset.description}`}
                onClick={() => {
                  onSelectPreset(preset);
                  onOpenChange(false);
                }}
                className="group flex size-36 flex-col items-center justify-center gap-4 rounded-lg border border-border bg-card p-3 text-center shadow-sm transition-all hover:border-foreground/20 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Icon className="text-muted-foreground transition-colors group-hover:text-foreground" />
                <span className="text-sm font-semibold leading-none text-foreground">
                  {preset.title}
                </span>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
