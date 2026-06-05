import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

type DetailPageActionFooterProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Viewport-fixed action bar for detail pages. Portaled to document.body so
 * parent transforms (e.g. animate-fade-in) do not trap position:fixed.
 */
export function DetailPageActionFooter({ children, className }: DetailPageActionFooterProps) {
  const [mounted, setMounted] = useState(false);


  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <footer
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.08)]',
        className,
      )}
      aria-live="polite"
    >
      <div className="flex items-center justify-end gap-2 px-6 py-3 md:px-8 md:py-4">
        {children}
      </div>
    </footer>,
    document.body,
  );
}
