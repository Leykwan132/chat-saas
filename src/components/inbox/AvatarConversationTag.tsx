import { ScanFace } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AvatarConversationTag({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-border bg-muted font-medium text-muted-foreground shadow-none',
        compact ? 'gap-1 px-1.5 py-0.5 text-[10px]' : 'gap-1.5 px-2.5 py-0.5 text-xs',
      )}
    >
      <ScanFace className={compact ? 'size-2.5' : 'size-3'} aria-hidden />
      Avatar
    </span>
  );
}
