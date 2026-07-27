import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

export function InboxAudioTranscript({ transcript }: { transcript: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mt-1">
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-auto gap-1 px-1 py-0.5 text-xs font-medium text-muted-foreground hover:bg-transparent hover:text-foreground aria-expanded:bg-transparent"
        >
          {open ? 'Hide Transcript' : 'Show Transcript'}
          <ChevronDown
            data-icon="inline-end"
            className={cn(
              'transition-transform duration-200',
              open && 'rotate-180',
            )}
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-1 rounded-md bg-muted px-2.5 py-2 text-xs leading-relaxed text-muted-foreground">
          <p className="whitespace-pre-wrap break-words">{transcript}</p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
