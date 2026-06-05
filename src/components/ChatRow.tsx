import { Pin, PinOff } from 'lucide-react';
import { isLeadTemperatureTag, getLeadTemperatureStyle } from '@/lib/leadTemperature';
import { SiInstagram, SiMessenger, SiWhatsapp } from 'react-icons/si';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';
import type { Id } from '../../convex/_generated/dataModel';

function getTagColorClass(tag: string): { bg: string; text: string; dot: string } {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % 6;
  const dotColors = [
    'bg-blue-500 dark:bg-blue-400',
    'bg-emerald-500 dark:bg-emerald-400',
    'bg-violet-500 dark:bg-violet-400',
    'bg-amber-500 dark:bg-amber-400',
    'bg-rose-500 dark:bg-rose-400',
    'bg-cyan-500 dark:bg-cyan-400',
  ];
  return {
    bg: 'bg-zinc-100 dark:bg-zinc-800/80 border-zinc-200/80 dark:border-zinc-700/60 shadow-none',
    text: 'text-zinc-800 dark:text-zinc-200',
    dot: dotColors[index],
  };
}

export type ConversationPlatform = 'whatsapp' | 'instagram' | 'messenger';

export type Chat = {
  id: Id<'conversations'>;
  name: string;
  message: string;
  time: string;
  unread: number;
  platform: ConversationPlatform;
  requiresAction: boolean;
  /** Inbox row status; used for label filter on Chats page. */
  conversationStatus: 'open' | 'snoozed' | 'closed';
  tags?: string[];
  leadTemperature?: 'Hot' | 'Warm' | 'Cold';
};

function PlatformGlyph({ platform }: { platform: ConversationPlatform }) {
  const common = { size: 14, style: { flexShrink: 0 } as const };
  switch (platform) {
    case 'whatsapp':
      return <SiWhatsapp {...common} className="text-[#25D366]" title="WhatsApp" />;
    case 'instagram':
      return (
        <SiInstagram {...common} className="text-[#E4405F]" title="Instagram" />
      );
    case 'messenger':
      return (
        <SiMessenger {...common} className="text-[#0866FF]" title="Messenger" />
      );
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
              }}>
                {chat.message}
              </p>
              {chat.unread > 0 && (
                <span style={{
                  width: 18, height: 18, borderRadius: '50%', background: '#ef4444',
                  color: 'white', fontSize: '10px', fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {chat.unread}
                </span>
              )}
            </div>
            {((chat.leadTemperature) || (chat.tags && chat.tags.length > 0)) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
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
                      const colors = getTagColorClass(tag);
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
