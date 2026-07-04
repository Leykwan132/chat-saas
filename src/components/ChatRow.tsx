import { Pin, PinOff, Image as ImageIcon, Volume2, AlertCircle, Globe } from 'lucide-react';
import { isLeadTemperatureTag, getLeadTemperatureStyle } from '@/lib/leadTemperature';
import { SiInstagram, SiMessenger, SiWhatsapp } from 'react-icons/si';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';
import { getPlatformIconClassName } from '@/lib/platformIconStyles';
import { BookedListLabel } from '@/components/booking/BookingDetailsPanel';
import type { Id } from '../../convex/_generated/dataModel';

function getTagColorClass(): { bg: string; text: string; dot: string } {
  return {
    bg: 'bg-zinc-100 dark:bg-zinc-800/80 border-zinc-200/80 dark:border-zinc-700/60 shadow-none',
    text: 'text-zinc-600 dark:text-zinc-400',
    dot: 'bg-zinc-400 dark:bg-zinc-500',
  };
}

export type ConversationPlatform = 'whatsapp' | 'instagram' | 'messenger' | 'web';

export type Chat = {
  id: Id<'conversations'>;
  name: string;
  message: string;
  time: string;
  unread: number;
  platform: ConversationPlatform;
  requiresAction: boolean;
  conversationStatus: 'open' | 'snoozed' | 'closed' | 'booked' | 'requires_user_input';
  tags?: string[];
  leadTemperature?: 'Hot' | 'Warm' | 'Cold';
  hasBooking?: boolean;
  escalation?: { question: string; context: string; escalatedAt: number };
};

function PlatformGlyph({ platform }: { platform: ConversationPlatform }) {
  const common = {
    size: 14,
    style: { flexShrink: 0 } as const,
    className: getPlatformIconClassName(platform),
  };
  switch (platform) {
    case 'whatsapp':
      return <SiWhatsapp {...common} title="WhatsApp" />;
    case 'instagram':
      return <SiInstagram {...common} title="Instagram" />;
    case 'messenger':
      return <SiMessenger {...common} title="Messenger" />;
    case 'web':
      return <Globe size={14} className={getPlatformIconClassName(platform)} />;
  }
}

type ChatRowProps = {
  chat: Chat;
  index: number;
  total: number;
  isSelected: boolean;
  isPinned: boolean;
  onSelect: (id: Id<'conversations'>) => void;
  onTogglePin: (id: Id<'conversations'>) => void;
};

export function ChatRow({ chat, index, total, isSelected, isPinned, onSelect, onTogglePin }: ChatRowProps) {

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          onClick={() => onSelect(chat.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '12px 16px',
            borderBottom: index !== total - 1 ? '1px solid var(--color-border)' : 'none',
            cursor: 'pointer', transition: 'background 0.12s',
            background: isSelected ? 'var(--color-surface-hover)' : 'transparent',
            position: 'relative',
          }}
          onMouseEnter={e => (!isSelected && (e.currentTarget.style.background = 'var(--color-surface-hover)'))}
          onMouseLeave={e => (!isSelected && (e.currentTarget.style.background = 'transparent'))}
        >
          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span style={{
                fontSize: '13px', fontWeight: 600, color: 'var(--color-foreground)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}>
                {isPinned && <Pin size={10} color="var(--color-foreground-subtle)" style={{ flexShrink: 0 }} />}
                <PlatformGlyph platform={chat.platform} />
                {chat.name}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--color-foreground-subtle)', flexShrink: 0, marginLeft: '8px' }}>
                {chat.time}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <p style={{
                margin: 0, fontSize: '12px',
                color: isSelected ? 'var(--color-foreground-muted)' : 'var(--color-foreground-muted)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1,
                display: 'flex', alignItems: 'center', gap: '4px',
              }}>
                {(chat.message === 'Image' || chat.message?.toLowerCase() === 'image' || chat.message?.startsWith('<image>')) && (
                  <ImageIcon size={12} className="shrink-0 text-muted-foreground" style={{ display: 'inline-block' }} />
                )}
                {(chat.message === 'Audio' || chat.message?.toLowerCase() === 'audio' || chat.message?.startsWith('<audio>')) && (
                  <Volume2 size={12} className="shrink-0 text-muted-foreground" style={{ display: 'inline-block' }} />
                )}
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{chat.message}</span>
              </p>
              {chat.unread > 0 && (
                <span className="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {chat.unread}
                </span>
              )}
            </div>
            {((chat.leadTemperature) || (chat.tags && chat.tags.length > 0) || chat.escalation || chat.hasBooking) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {chat.hasBooking ? <BookedListLabel /> : null}
                  {chat.escalation && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/40 px-1.5 py-0.2 text-[10px] font-semibold text-amber-700 dark:text-amber-400 transition-all shadow-none"
                    >
                      <AlertCircle className="size-2.5 shrink-0 text-amber-500" />
                      <span className="max-w-[70px] truncate" title="Escalated to human">
                        Escalated
                      </span>
                    </span>
                  )}
                  {chat.leadTemperature && (() => {
                    const style = getLeadTemperatureStyle(chat.leadTemperature);
                    const Icon = style.icon;
                    return (
                      <span
                        key={chat.leadTemperature}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.2 text-[10px] font-medium transition-all shadow-none",
                          style.bg,
                          style.text
                        )}
                      >
                        <Icon className={cn("size-2.5 shrink-0", style.iconClass)} />
                        <span className="max-w-[70px] truncate" title={chat.leadTemperature}>
                          {chat.leadTemperature}
                        </span>
                      </span>
                    );
                  })()}
                  {chat.tags && chat.tags
                    .filter((tag: string) => !isLeadTemperatureTag(tag))
                    .map((tag: string) => {
                      const colors = getTagColorClass();
                      return (
                        <span
                          key={tag}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.2 text-[10px] font-medium transition-all shadow-none",
                            colors.bg,
                            colors.text
                          )}
                        >
                          <span className={cn("size-1 rounded-full shrink-0", colors.dot)} />
                          <span className="max-w-[70px] truncate" title={tag}>
                            {tag}
                          </span>
                        </span>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => onTogglePin(chat.id)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isPinned ? <PinOff size={14} /> : <Pin size={14} />}
          {isPinned ? 'Unpin' : 'Pin'}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
