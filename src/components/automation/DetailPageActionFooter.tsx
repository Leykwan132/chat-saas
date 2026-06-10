import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { getSidebarContentInsetLeft, useOptionalSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

type DetailPageActionFooterProps = {
  children: ReactNode;
  className?: string;
  fullWidth?: boolean;
  /** When true, the bar spans only the main content area (not over the app sidebar). Default: true */
  respectSidebar?: boolean;
};

/**
 * Viewport-fixed action bar for detail pages. Portaled to document.body so
 * parent transforms (e.g. animate-fade-in) do not trap position:fixed.
 */
export function DetailPageActionFooter({
  children,
  className,
  fullWidth = false,
  respectSidebar = true,
}: DetailPageActionFooterProps) {
  const [mounted, setMounted] = useState(false);
  const sidebar = useOptionalSidebar();

  const insetLeft = useMemo(() => {
    if (!respectSidebar || !sidebar) return undefined;
    return getSidebarContentInsetLeft(sidebar.state, sidebar.isMobile);
  }, [respectSidebar, sidebar]);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <footer
      className={cn(
        'fixed bottom-0 right-0 z-50 border-t border-border bg-background shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.08)]',
        className,
      )}
      style={insetLeft ? { left: insetLeft } : { left: 0 }}
      aria-live="polite"
    >
      <div
        className={cn(
          fullWidth ? 'w-full p-0' : 'flex items-center justify-end gap-2 px-6 py-3 md:px-8 md:py-4',
        )}
      >
        {children}
      </div>
    </footer>,
    document.body,
  );
}
