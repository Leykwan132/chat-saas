import { Pin, PinOff } from 'lucide-react';
import { SiInstagram, SiMessenger, SiWhatsapp } from 'react-icons/si';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import type { Id } from '../../convex/_generated/dataModel';

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
