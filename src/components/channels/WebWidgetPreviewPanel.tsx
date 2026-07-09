import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion } from 'motion/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { WebWidgetTheme } from '../../../shared/webWidgetThemes';
import { cn } from '@/lib/utils';
import {
  WebWidgetPreviewConversation,
  type WebWidgetPreviewMessage,
} from './WebWidgetPreviewConversation';

const FALLBACK_WIDGET_ICON_URL = '/icon.svg';

type WebWidgetPreviewPanelProps = {
  agentName: string;
  children?: ReactNode;
  className: string;
  iconUrl?: string;
  fullScreen?: boolean;
  loading?: boolean;
  messages: WebWidgetPreviewMessage[];
  open: boolean;
  poweredBy: boolean;
  sendError?: string | null;
  theme: WebWidgetTheme;
  onClose: () => void;
};

export function WebWidgetPreviewPanel({
  agentName,
  children,
  className,
  iconUrl,
  fullScreen = false,
  loading = false,
  messages,
  open,
  poweredBy,
  sendError = null,
  theme,
  onClose,
}: WebWidgetPreviewPanelProps) {
  return (
    <div
      aria-hidden={!open}
      className={cn(
        'absolute w-[min(92vw,430px)]',
        fullScreen && 'w-full',
        open ? 'pointer-events-auto' : 'pointer-events-none',
        className,
      )}
    >
      <motion.div
        animate={{
          opacity: open ? 1 : 0,
          y: open ? 0 : 44,
        }}
        className={cn(
          'relative flex w-full flex-col overflow-hidden rounded-[24px] border border-white/20 bg-[#8b8c86]/80 text-white shadow-sm backdrop-blur-xl',
          fullScreen ? 'h-full' : 'h-[360px]',
        )}
        initial={false}
        transition={{
          type: 'spring',
          stiffness: 320,
          damping: 36,
          mass: 0.9,
        }}
      >
        <div
          className={cn(
            'pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b to-transparent',
            'from-white/16 via-white/7',
          )}
        />
        <div
          className={cn(
            'relative z-10 flex items-center justify-between px-4 py-3',
          )}
        >
          <div className="flex min-w-0 items-center gap-2">
            <WidgetAvatar iconUrl={iconUrl} name={agentName} theme={theme} />
            <span className="truncate text-sm font-normal">{agentName}</span>
          </div>
          <button
            type="button"
            className={cn(
              'flex size-7 shrink-0 items-center justify-center rounded-full transition',
              'text-white/70 hover:bg-white/10 hover:text-white',
            )}
            aria-label="Close preview chat"
            onClick={onClose}
          >
            <ChevronDown className="size-4" />
          </button>
        </div>

        <div className="relative z-10 flex min-h-0 flex-1 overflow-hidden">
          <WebWidgetPreviewConversation
            agentName={agentName}
            iconUrl={iconUrl}
            loading={loading}
            messages={messages}
            sendError={sendError}
          />
        </div>
        {poweredBy ? (
          <div
            className={cn(
              'relative z-10 text-center text-[11px] leading-none text-white/55',
              children ? 'pb-2' : 'pb-4',
            )}
          >
            Powered by{' '}
            <a
              href="https://kilobot.app/"
              target="_blank"
              rel="noreferrer"
              className="text-white/65 underline-offset-2 hover:text-white hover:underline"
            >
              Kilobot
            </a>
          </div>
        ) : null}
        {children ? (
          <div className="relative z-10 bg-transparent p-4">
            {children}
          </div>
        ) : null}
      </motion.div>
    </div>
  );
}

function WidgetAvatar({
  iconUrl,
  name,
  theme,
}: {
  iconUrl?: string;
  name: string;
  theme: WebWidgetTheme;
}) {
  const dark = theme === 'dark';
  const imageUrl = iconUrl || FALLBACK_WIDGET_ICON_URL;

  return (
    <Avatar className={cn('size-8 border', dark ? 'border-white/15 bg-white/10' : 'border-border bg-muted')}>
      <AvatarImage src={imageUrl} alt={name} />
      <AvatarFallback className={cn('bg-transparent', dark ? 'text-white' : 'text-foreground')}>
        {name.slice(0, 1).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}
